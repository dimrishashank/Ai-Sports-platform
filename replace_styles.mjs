import fs from 'fs';
import path from 'path';

const walkSync = (dir, callback) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    var filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile() && filepath.endsWith('.tsx')) {
      callback(filepath);
    }
  });
};

walkSync('./src', (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  content = content.replace(/glass-panel-dark/g, 'bg-white shadow-sm border border-gray-200');
  content = content.replace(/glass-panel/g, 'bg-white shadow-sm border border-gray-200');
  content = content.replace(/bg-black\/60/g, 'bg-white');
  content = content.replace(/bg-black\/40/g, 'bg-white');
  content = content.replace(/bg-black\/20/g, 'bg-gray-100');
  content = content.replace(/bg-black/g, 'bg-white');
  content = content.replace(/text-white\/90/g, 'text-gray-900');
  content = content.replace(/text-white\/80/g, 'text-gray-800');
  content = content.replace(/text-white\/70/g, 'text-gray-700');
  content = content.replace(/text-white\/60/g, 'text-gray-600');
  content = content.replace(/text-white\/50/g, 'text-gray-500');
  content = content.replace(/text-white\/40/g, 'text-gray-500');
  content = content.replace(/text-white\/30/g, 'text-gray-400');
  content = content.replace(/text-white\/20/g, 'text-gray-400');
  content = content.replace(/text-white\/10/g, 'text-gray-300');
  content = content.replace(/text-white/g, 'text-gray-900');
  content = content.replace(/border-white\/30/g, 'border-gray-300');
  content = content.replace(/border-white\/20/g, 'border-gray-300');
  content = content.replace(/border-white\/10/g, 'border-gray-200');
  content = content.replace(/border-white\/5/g, 'border-gray-100');
  content = content.replace(/shadow-2xl/g, 'shadow');
  content = content.replace(/shadow-xl/g, 'shadow');
  content = content.replace(/hover:text-white/g, 'hover:text-gray-900');
  content = content.replace(/hover:bg-white\/10/g, 'hover:bg-gray-100');
  content = content.replace(/hover:bg-white\/5/g, 'hover:bg-gray-50');
  
  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
  }
});
