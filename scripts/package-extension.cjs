// Dependency-free ZIP writer (stored entries) for extension runtime files.
const fs = require('node:fs');
const path = require('node:path');
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit=0; bit<8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
module.exports = function packageExtension(root, destination, files) {
  const local = [], central = [];
  let offset = 0;
  for (const filename of files) {
    const data = fs.readFileSync(path.join(root,filename));
    const name = Buffer.from(filename);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20,4);
    header.writeUInt16LE(33,12); // 1980-01-01, deterministic archive date.
    header.writeUInt32LE(crc32(data),14);
    header.writeUInt32LE(data.length,18); header.writeUInt32LE(data.length,22);
    header.writeUInt16LE(name.length,26);
    local.push(header,name,data);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50); record.writeUInt16LE(20,4);
    header.copy(record,6,4,28); record.writeUInt32LE(offset,42);
    central.push(record,name);
    offset += header.length + name.length + data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length,8); end.writeUInt16LE(files.length,10);
  end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16);
  fs.writeFileSync(destination,Buffer.concat([...local,directory,end]));
};
