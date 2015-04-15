module.exports = {
	'test' : {
		instant : false,
		repeat :  -1,
		fade: 1,
		wait: 1,
		colors: ["#FB1911", "#00ff00", "#4156FF", "#FF001D", "#FFFF07"],
		sequence : []
	},
	'available' : {
		instant : true,
		repeat : 0,
		fade: 1,
		wait: 0,
		colors: ["#3523f6"],
		sequence : []
	},
	'occupied' : {
		instant : true,
		repeat : 0,
		fade: 0,
		wait: 0,
		start : 0,
		end : 0,
		colors: ["#0EFF63", "#f3e533", "#fc312c"],
		sequence : []
	}
};