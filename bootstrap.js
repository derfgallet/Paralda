

// App version
global.version = '0.2';

// Show logo and version
console.log('ParalDa v' + global.version + ' (using Node.js ' + process.version + ')');
console.log('Copyright (c) 2017 - Frédéric GALLET - derf.gallet@free.fr');


// Start main application
require('./app/app').run();

