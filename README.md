# Intelligent Sensors Average Value Computation

This is a node-red node that computes a reliable and representative average/mean value of sensors process value. This node will automatically discard faulty, excluded or buggy sensors that are having process values beyond a pre-defined threshold when compared to the average value of all sensors. Values of all sensors are integrated over time and compared to the mean value on a cyclic basis. The logic can be used to compute an average value of radiation sensors or temperature senors dispateched on a PV plant.

I coded also this logic in IEC-61131-3 language [check on my website][1]

## Usage

The node will accept an input/msg in JSON format having the following fields:

- data: is an array of sensors process values
- enable: boolean to enable or disable the logic. When disabled, the average/mean value of all sensors will be simply the arithmetic mean of all active sensors
- active_sensors: an array of boolean indexed sensors; this is only a convenience, the array can be only populated with ones. Every bit corresponds to a sensor
- excluded sensors: and array of sensors which are intentionally excluded by the operator (e.g. sensor in maintenance)
- faulty_sensors: an array of faulty sensors as per faults detected by the controller (e.g. value out of bound, coms failure, etc.)
- tolerance: acceptable deviation from mean value threshold
- rst: boolean to reset the computations (must be pulsed signal). Perform this computation on cyclic basis with a duty cycle of 15 – 20 minutes 

```JSON
{
    "data": [
        3,
        5,
        6
    ],
    "enable": 1,
    "active_sensors": [
        1,
        1,
        1
    ],
    "excluded_sensors": [
        0,
        0,
        0
    ],
    "faulty_sensors": [
        0,
        0,
        0
    ],
    "tolerance": 20,
    "rst": 0
}
```

The node will output the mean value of all valid/sane sensors, the deviation between sensors, an array of sensors showing the faulty sensors as computed by this node and an array of sensors excluded by the operator.

## References

[Author's Website][1]

[1]: http://www.akconcept.epizy.com/website/solar
