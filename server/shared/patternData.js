module.exports = {
	'available': {
		title: 'Available',
		type: 'default',
		instant: true,
		repeat: 0,
		fade: 1,
		wait: 0,
		colors: [ "#3523f6" ],
		sequence: []
	},
	'occupied': {
		title: 'In Use',
		type: 'default',
		instant: true,
		repeat: 0,
		fade: 0,
		wait: 0,
		start: 0,
		end: 0,
		colors: [ "#0EFF63", "#f3e533", "#fc312c" ],
		sequence: []
	},
	'ending': {
		title: 'About to End',
		type: null,
		instant: false,
		repeat: -1,
		fade: 1,
		wait: 2,
		colors: [ "#000000", "#fc312c" ],
		sequence: []
	},
	'party': {
		title: 'Party Time',
		type: 'custom',
		instant: true,
		repeat: -1,
		fade: 0,
		wait: 1,
		colors: [ "#ff00d8", "#ff0024", "#ffea00", "#ff0000" ],
		sequence: []
	},
	'client': {
		title: 'Client Meeting',
		type: 'custom',
		instant: true,
		repeat: -1,
		fade: 0,
		wait: 1,
		colors: [ "#18b64c", "#ff0024", "#ffea00", "#0c00ff" ],
		sequence: []
	},
	'more': {
		title: 'Five More Minutes!',
		type: 'custom',
		instant: true,
		repeat: -1,
		fade: 0,
		wait: 1,
		colors: [ "#3523f6", "#ff0024" ],
		sequence: []
	}
};