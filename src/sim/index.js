'use strict';
['core', 'inventory', 'world', 'mechanics', 'comms', 'units', 'enemy', 'staff', 'player', 'ops', 'sim'].forEach(f => require('./' + f + '.js'));
module.exports = globalThis.FOB;
