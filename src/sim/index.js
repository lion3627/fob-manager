'use strict';
['core', 'inventory', 'world', 'mechanics', 'comms', 'units', 'enemy', 'staff', 'player', 'sim'].forEach(f => require('./' + f + '.js'));
module.exports = globalThis.FOB;
