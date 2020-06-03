module.exports = function(RED) {
	//require simple-statistics
	var stats = require('simple-statistics');
	//require node-bitarray
	var bitarray = require('node-bitarray');
    function SensorsAVG(config) {
        RED.nodes.createNode(this,config);
        var node = this;
	    var context = this.context();
        node.on('input', function(msg) {
			//compute sensors status based on selected by operator and faulty sensors
			var disabled_sensors = bitarray.or(msg.payload.excluded_sensors,msg.payload.faulty_sensors);
			//bitarray xor operation not giving the expected result - converting to numbers and using javascript xor operator (^)
			var sensors_input_status = bitarray.toNumber(msg.payload.active_sensors)^bitarray.toNumber(disabled_sensors);
			//get number of non-faulty & non-excluded sensors
			var sane_sensors = bitarray.bitcount(sensors_input_status);
			var sane_sensors_array = bitarray.fromNumber(sensors_input_status);
			//totalizer
			//meters array has a context scope (persistent)
			var meters = context.get('meters') || [];
			//initialise meters array if empty then totalize
			if(context.get('meters') == null) {
				for(i=0; i<sane_sensors_array.length; i++) {
					context.set('meters['+i+']', 0);
				}
			} else {
			//totalize using values passed with data array 
				for(i=0; i<context.get('meters').length; i++) {
					context.set('meters['+i+']', context.get('meters['+i+']')+msg.payload.data[i]);
				} 
			}
			//sort good meters into a new array for computations
			var sorted_meters = [];
			for(i=0, j=0; i<sane_sensors_array.length; i++) {
				if(sane_sensors_array.get(i)) {
					sorted_meters[j] = context.get('meters['+i+']');
					j++;
				}
			}
			//statistical computations need at least 2 values
			if(sane_sensors > 1) {
				var mean = stats.mean(sorted_meters);
				var sd = stats.sampleStandardDeviation(sorted_meters);
				var rsd = 100*(sd/mean); 
			} else {
			var mean = stats.mean(sorted_meters);
			var sd = 0;
			var rsd = 0;
			}
			//check valid sensors - persistent array
			var valid_sensors = context.get('valid_sensors') || [];
			//initialise valid_sensors array if empty
			if(context.get('valid_sensors') == null) {
				for(i=0; i<sane_sensors_array.length; i++) {
					context.set('valid_sensors['+i+']', 1);
				}
			}
			//following computations must be locked else statistical computations are false
			var trig_rst = context.get('trig_rst') || false;
			if(context.get('trig_rst') == null) {
				context.set('trig_rst', false);
			}
			if((Number(msg.payload.rst) === 1) && (trig_rst === false)) {
			//latch reset bit; if not latched mean will be computed based on reseted meters array
			context.set('trig_rst', true);
			//declare bad_sensors array based on stdev
			var bad_sensors = [];
				for(i=0; i<sane_sensors_array.length; i++) {
					if((100*(context.get('meters['+i+']')-mean)/mean) > Number(msg.payload.tolerance) || (-100*(context.get('meters['+i+']')-mean)/mean) > Number(msg.payload.tolerance)) {
						bad_sensors[i] = 0;
						context.set('valid_sensors['+i+']', bad_sensors[i]*sane_sensors_array.get(i));
					} else {
					bad_sensors[i] = 1;
					context.set('valid_sensors['+i+']', bad_sensors[i]*sane_sensors_array.get(i));
					}    
				}
			//bitarray.and not successful; bad_sensors == [] while sane_sensors_array == bitarray
			//sane_sensors_array cannot be indexed, must use get() method to access elements
			}
			if((Number(msg.payload.rst) === 0) && (trig_rst === true)) {
			//unlatch reset bit
			context.set('trig_rst', false);
			//reset counters
				for(i=0; i<context.get('meters').length; i++) {
				context.set('meters['+i+']', 0);
				}
			}
			//average value of sensors
			//sum and avg are initialized at every node call
			var sum = 0.0;
			var avg = 0.0;
			if((Number(msg.payload.enable) === 1) && (bitarray.bitcount(valid_sensors) > 0)) {
				for(i=0; i<sane_sensors_array.length; i++) {
					sum += (msg.payload.data[i]*valid_sensors[i]);
				}
			avg = sum/(bitarray.bitcount(valid_sensors));
			} else {
			//do computations based on sane sensors only
				for(i=0; i<sane_sensors_array.length; i++) {
					sum += (msg.payload.data[i]*sane_sensors_array.get(i));
				}
			avg = sum/sane_sensors;
			}
			//msg output
			msg = {"payload": msg.payload, "meters": meters, "avgmet": mean, "mean": avg, "rsd": rsd, "sane_sensors": sane_sensors_array, "valid_sensors": valid_sensors};
			node.send(msg);
        });
    }
    RED.nodes.registerType("sensors-average",SensorsAVG);
}
