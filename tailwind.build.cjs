/* Compila css/styles.css reutilizando el tema de js/tailwind.config.js:
   npx tailwindcss@3.4.16 -c tailwind.build.cjs -i css/input.css -o css/styles.css --minify */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { tailwind: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'js/tailwind.config.js'), 'utf8'), sandbox);

module.exports = {
  ...sandbox.tailwind.config,
  content: [path.join(__dirname, '*.html'), path.join(__dirname, 'js/app.js')],
};
