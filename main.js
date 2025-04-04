require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/rest/support/Query",
    "esri/renderers/ClassBreaksRenderer",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/PopupTemplate",
    "esri/widgets/Legend"
], function (Map, MapView, FeatureLayer, Query, ClassBreaksRenderer, SimpleMarkerSymbol, PopupTemplate, Legend){
	
	let totalFeatures = 0;  //global variable to keep track of the total features across all potential queries.
	
	let currentFeatureCount = 0; //initially set to 0
	const batchSize = 1000; //AGO only retrieves the first 1k features so i'll retrieve them in batches of 1k with recursive function calls
	let currentBatch = 0; //counter to keep track of the batches
	let allFeatures = []; //array to store all of the features within the batches.
      
    var windSpeedGeometries;
    
    var layerSelect = document.getElementById("layer-select");
    
    var windSpeedSelect = document.getElementById("wind-speed-selection");
    
    var queryWindSpeed = document.getElementById("query-wind-speed");
    
    const map = new Map({
        basemap: "dark-gray-vector"
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        zoom: 3,
        center: [-87, 39]
    });

    const stationsLayer = new FeatureLayer({
        url: "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NOAA_METAR_current_wind_speed_direction_v1/FeatureServer/0",
        outFields: ["*"],  
        layerId: 0, 
        visible: false
    });

    const buoysLayer = new FeatureLayer({
        url: "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/NOAA_METAR_current_wind_speed_direction_v1/FeatureServer/1",
        outFields: ["*"], 
        layerId: 1, 
        visible: false
    });

    map.addMany([stationsLayer, buoysLayer]);
	
	function addClassBreaksRenderer(renderer) {   // function to add class breaks to the renderer. Trying to clean repeated code by declaring symbols only once.
		const classBreakInfos = [
		{ 
			minValue: 0, 
			maxValue: 4, 
			color: [255, 255, 250, 1] //almost white to create more visible contrast.
		}, 
		{ 
			minValue: 5, 
			maxValue: 9, 
			color: [255, 237, 160, 1] 
		}, 
		{ 
			minValue: 10, 
			maxValue: 14, 
			color: [254, 217, 118, 1] 
		}, 
		{ 
			minValue: 15, 
			maxValue: 19, 
			color: [254, 178, 76, 1] 
		}, 
		{ 
			minValue: 20, 
			maxValue: 24, 
			color: [253, 141, 60, 1] 
		}, 
		{ 
			minValue: 25, 
			maxValue: 29, 
			color: [252, 78, 42, 1] 
		}, 
		{ 
			minValue: 30, 
			maxValue: 34, 
			color: [227, 26, 28, 1] 
		},
		{ 
			minValue: 35, 
			maxValue: 39, 
			color: [204, 0, 51, 1] 
		},
		{ 
			minValue: 40, 
			maxValue: 44, 
			color: [204, 153, 255, 1] 
		},
		{ 
			minValue: 45, 
			maxValue: 49, 
			color: [153, 102, 255, 1] 
		},
		{ 
			minValue: 50, 
			maxValue: 667, 
			color: [102, 0, 153, 1] 
		} 
	];

		const symbols = classBreakInfos.map(function (classBreakInfo) { // declare symbol object for CBR by mapping the classBreakInfos array to SimpleLineSymbols.
			return new SimpleMarkerSymbol({
				style: "circle",
				size: "7px",
				color: classBreakInfo.color,
				width: 2,
			});
		});

		classBreakInfos.forEach(function (classBreakInfo, index) { //Loop to add CBI to the symbols at each array index
			renderer.addClassBreakInfo({
				minValue: classBreakInfo.minValue,
				maxValue: classBreakInfo.maxValue,
				symbol: symbols[index]
			});
		});
	}
	
	const renderer = new ClassBreaksRenderer( //Create a new CBR object on the USA_WIND field.
	{ 
		field: "WIND_SPEED" 
	});
	
	addClassBreaksRenderer(renderer);
	
	const popupTemplate = { //popupTemplate hasn't changed since last time
		title: "{STATION_NAME}",
		content: [
			{
				type: "fields",
				fieldInfos: [
					 {
						fieldName: "WIND_DIRECT",
						visible: true,
						label: "Wind Direction (degrees)"
					},
					{
						fieldName: "WIND_SPEED",
						visible: true,
						label: "Wind Speed (km/h)"
					},                       
					{
						fieldName: "WIND_GUST",
						visible: true,
						label: "Wind Gust (km/h)"
					}
				]
			}
		]
	};
	
	/* The fucntions below are taken from lesson 8 Codepen examples and my lesson 8 assgnment and re-hashed  to suit the requirements of this project. Unlike the previous
		code examples, this app must take two different feature layers into account and query from only the one selected by the user. User selects a layer first, THEN 
		the wind speed dropdown is popualted with data from the selected layer.*/
	
	function queryFeatures(layer, windSpeed, start, batchSize) {
		var query = layer.createQuery();
		query.where = "WIND_SPEED = '" + windSpeed + "'";
		query.start = start; //have to set the starting indext for the features to be retrieved
		query.batchSize = batchSize; //the number of features to be retrieved in each query
		return layer.queryFeatures(query);
	} 
    
    function queryAndPopulateWindSpeedDropdown(selectedLayer) { 
		view.whenLayerView(selectedLayer).then(function () {
			var query = selectedLayer.createQuery();
			query.orderByFields = ["WIND_SPEED DESC"];
			return selectedLayer.queryFeatures(query);
		}).then(getValues).then(getUniqueValues).then(addToSelect)
	}
    
    function getValues(response) {
        var features = response.features;
        var values = features.map(function (feature) {
            return feature.attributes.WIND_SPEED;
        });        
        return values;
    }
    
    function getUniqueValues(values) {
        var uniqueValues = [];

        values.forEach(function (item, i) {
            if ((uniqueValues.length < 1 || uniqueValues.indexOf(item) === -1) && item !== "") { 
                uniqueValues.push(item);                                                        
            }                                                                                   
        });
        return uniqueValues;
    }
    
    function addToSelect(values) {
        values.sort(function(a, b) {
			return b - a;
		});
        values.forEach(function (value) {
            var option = document.createElement("option");
            option.text = value;
            windSpeedSelect.add(option);
        });
        return setWindSpeedDefinitionExpression(windSpeedSelect.value);
    }
    
    layerSelect.addEventListener("change", function () { //event listenser for layer select
        var selectedLayer = layerSelect.value === "stations" ? stationsLayer : buoysLayer;
        queryAndPopulateWindSpeedDropdown(selectedLayer);
    });
    
    windSpeedSelect.addEventListener("change", function () { //event listener for dropdown list change event for selecting the wind speed 
        var selectedLayer = layerSelect.value === "stations" ? stationsLayer : buoysLayer;
        setWindSpeedDefinitionExpression(selectedLayer, windSpeedSelect.value);
    });

    queryWindSpeed.addEventListener("click", function () { //event listener for the query button 
		clearLegend()
        var selectedLayer = layerSelect.value === "stations" ? stationsLayer : buoysLayer;
        queryFeatures(selectedLayer, windSpeedSelect.value).then(function(results) {
            displayResults(results, layerSelect.value);
        });
    });
	
	document.getElementById("clear-results").addEventListener("click", function() { //clear results button.
		clearResults();
	});
	
	function clearResults() { //executed when user clicks clear results button
		const featureList = document.getElementById("feature-list");
		featureList.innerHTML = "";
		
		map.removeAll();
		clearLegend(); 
		totalFeatures = 0; //Reset the totalFeatures counter to zero
		
		const featureCountElement = document.getElementById("feature-count"); //Update UI element to reflect total features count
		if (featureCountElement) {
			featureCountElement.textContent = "Total features displayed: 0";
		}
	}
    
    function setWindSpeedDefinitionExpression(newValue) { // set the definition expression on the layer to reflect the selection of the user
		var selectedLayer = layerSelect.value === "stations" ? stationsLayer : buoysLayer;
        selectedLayer.definitionExpression = "WIND_SPEED = '" + newValue + "'";
        return queryForWindSpeedGeometries(newValue);
    }
    
    function queryForWindSpeedGeometries(windSpeed) { // Get all the geometries of the layer
		
		var selectedLayer = layerSelect.value === "stations" ? stationsLayer : buoysLayer;
        var windSpeedQuery = selectedLayer.createQuery();
        windSpeedQuery.where = "WIND_SPEED = '" + windSpeed + "'";

        return selectedLayer.queryFeatures(windSpeedQuery).then(function(response) {
            windSpeedGeometries = response.features.map(function(feature) {
                return feature.geometry;
            });

            return windSpeedGeometries;
        });
    }
	
	function clearLegend() {  // function to remove the legend from the view.
		const legendDiv = document.getElementById("legend"); 
		if (legendDiv) { //if there's a legend present remove it's html element
			legendDiv.parentNode.removeChild(legendDiv);
		}
	}
	
	function queryNextBatch(layer, windSpeed) {
        var start = currentBatch * batchSize; //start is used to get the starting index of the next batch to be retrieved recursively by multiplying the current batch index by 1000.
        return queryFeatures(layer, windSpeed, start, batchSize).then(function(results) {
            allFeatures = allFeatures.concat(results.features); //Concatenate the features from this batch to the array
            currentFeatureCount += results.features.length; //need to update the current feature count
            totalFeatures += results.features.length; //also need to update the total feature count
            currentBatch++; //increment the batch counter

            if (results.features.length === batchSize) { //If there are more features to fetch, recursively call queryNextBatch
                return queryNextBatch(layer, windSpeed);
            } else {
                displayResults(allFeatures, layerSelect.value);
            }
        });
    }
	
	function getWindSpeedDistribution(windSpeeds, totalFeatures) { //windspeeds is an array containing all of the feature's windspeed from the current querey
																 // total features is the total amount of features on the map.
		const windSpeedCounts = {}; //get a count of the occurences of each windspeed
		windSpeeds.forEach(speed => { //iterate over the windSPeedCounts array to keep track of how many times each wind speed appears
			if (windSpeedCounts[speed] !== undefined) //wind speed value needs to exist already if we're going to increase the counter beyond 1.
			{
				windSpeedCounts[speed] += 1; //if it does increase the counter.
			} 
			else 
			{
				windSpeedCounts[speed] = 1; //if it doesn't, set the counter to 1.
			}
		});
		
		const percentages = Object.entries(windSpeedCounts).map(([speed, count]) => ({ //each time a query is made this object is created to keep track of all of the particular queried feature's appearances
			speed: Number(speed),
			count,
			percentage: (count / totalFeatures) * 100 //this is the percentage that must be passed to the pie chart to update it with each query.
		}));
		
		console.log("Calculated percentages:", percentages);

		return percentages;
	}
	
	//Reminder to integrate this into getWindSpeedDistribution.
/*	function calculateOlderPercentages(percentages, totalFeatures) { //this is a fucntion that re-calculates the percentages of older query's data. It's used to 
																		//genereate a new pie chart with updated data for older queries so it doesn't just show one
																		//pie slice with the most recent query percentage. Can't get this to work atm.
		const olderPercentages = []; //the values for older percentages are going to be stored in an array since normally there will be more than one.
		
		percentages.forEach(item => {
			const windSpeedCounts = {}; // Object to store counts of each wind speed
			
			item.features.forEach(feature => {
				const speed = feature.attributes.WIND_SPEED;
				if (windSpeedCounts[speed] !== undefined) 
				{
					windSpeedCounts[speed] += 1; //Increment count for the existing wind speed like in getWindSpeedDist
				} 
				else 
				{
					windSpeedCounts[speed] = 1; //set count to 1 for the new wind speed encountered in the loop/
				}
			});
			
			//Calculate percentages for each wind speed and push to olderPercentages array. This is done by divided each number in the array by the total features.
			//olderPercentages is going to be used like d.data.percentage was used to calculate angles for the pie chart. (d.data.olderPercentages).
			Object.entries(windSpeedCounts).forEach(([speed, count]) => {
				const percentage = (count / totalFeatures) * 100;
				olderPercentages.push({
					speed: Number(speed),
					count,
					percentage
				});
			});
		});	
		return olderPercentages;
	}
   */
		
    function displayResults(results, layerType) {
		const fields = layerType === "stations" ? stationsLayer.fields : buoysLayer.fields; //fields need to match whichever layer (stations or buoys) was queried.

		const featureList = document.getElementById("feature-list"); //Feature list and pie chart container
		featureList.innerHTML = "";
		const pieChartContainer = document.createElement("div");
		pieChartContainer.id = "pie-chart";
		featureList.appendChild(pieChartContainer);

		const windPointResultFeatures = results.features.map(function (graphic) { 
			return graphic;
		});

		const resultsFeatureLayer = new FeatureLayer({
			source: windPointResultFeatures,
			fields: fields,
			renderer: renderer,
			popupTemplate: popupTemplate,
			visible: true
		});

		map.add(resultsFeatureLayer);

		const legendDiv = document.createElement("div");
		legendDiv.id = "legend";
		view.ui.add(legendDiv, "bottom-left");
		legendDiv.style.opacity = "0.8";

		const legend = new Legend({
			view: view,
			container: legendDiv,
			layerInfos: [{
				layer: resultsFeatureLayer,
				title: "Legend"
			}]
		});
		
		totalFeatures += results.features.length; //Have to do this first

		const windSpeeds = results.features.map(feature => feature.attributes.WIND_SPEED); //basically get all the features from the query
		const percentages = getWindSpeedDistribution(windSpeeds, totalFeatures); //now that total features and the number of new features in query are available, calculate the percentages.
		//const olderPercentages = calculateOlderPercentages(percentages, totalFeatures); // declare a variable for older percentages.

		const width = 190;
		const height = 190;
		const radius = Math.min(width, height) / 2;

		const container = d3.select("#pie-chart");

		// Create a new SVG element within the container https://observablehq.com/@d3/pie-chart/2?intent=fork is quite helpful in understanding pie charts in D3
		const svg = container.append("svg")
			.attr("width", width)
			.attr("height", height)
			.append("g") //Append a group element for pie chart elements
			.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")"); // Translate to center

		const colorScale = d3.scaleSequential()
			.domain([0, 100]) // Defined according to percentage. The idea is to have lower percentages be a "cooler" color close to blue. Higher percentages close to red.
			.interpolator(d3.interpolateRgb("blue", "red"));

		const pie = d3.pie()
			.value(function(d) { return d.percentage; });

		const data_ready = pie(percentages); //Generate pie chart data	

		svg.selectAll('path') // Create 'path' elements for each slice
			.data(data_ready) 
			.join('path')
			.attr('d', function(d) {
				const startAngle = d.data.percentage * 2 * Math.PI / 100; //calculate start angle based on percentage. This uses d.data.percentage (the data ready variable specified above)
				const endAngle = startAngle + d.data.percentage * 2 * Math.PI / 100; //Calculate end angle				
				/*if (d.data.olderPercentages) {
					d.data.olderPercentages.forEach(oldPercentage => {
						const olderStartAngle = endAngle; 
						const olderEndAngle = olderStartAngle + oldPercentage.percentage * 2 * Math.PI / 100; 
						endAngle = olderEndAngle;
					});
				} */
				return d3.arc()
					.innerRadius(0)
					.outerRadius(radius)
					.startAngle(startAngle)
					.endAngle(endAngle)(d); // Generate arc path
				})
				
			.attr('fill', function(d, i) {
				return colorScale(d.data.percentage); // Assign colors according to the percentage
			})
			.attr("stroke", "black")
			.style("stroke-width", "2px")
			.style("opacity", 0.7)
		  
			.append('title') // Append title element for tooltips
			.text(function(d) {
				return d.data.percentage.toFixed(1) + "% of features on the map";
			});
			
		results.features.forEach(function (feature) { //creating some list elements with a foreach
			const listItem = document.createElement("li");

			if (layerType === "stations") 
			{
				listItem.textContent = "Station Name: " + feature.attributes.STATION_NAME;
			} 
			else 
			{
				listItem.textContent = "Buoy ID: " + feature.attributes.STATIONID;
			}

			const popupTitle = layerType === "stations" ? feature.attributes.STATION_NAME : feature.attributes.STATIONID;

			listItem.addEventListener("click", function() {
				view.popup.open({
				title: popupTitle,
				features: [feature],
				location: feature.geometry.centroid
				});
			});
			featureList.appendChild(listItem);
		});
	}
});
	
