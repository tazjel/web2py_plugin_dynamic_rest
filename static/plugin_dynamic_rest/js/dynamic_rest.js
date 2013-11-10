function DynamicRest(url) {
	var collection = [];
	collection.url = url;
	collection.insort = function(x) {
		$.observable(collection).insert(this.bisect(x.id), x);
	}
	collection.find = function(x) {
		var element = this[this.bisect(x)];
		if (element.id == x) {
			return element;
		}
		return undefined;
	}
	collection.bisect = function(x, lo, hi) {
		var mid;
		if (typeof(lo) == 'undefined') {
			lo = 0;
		}
		if (typeof(hi) == 'undefined') {
			hi = this.length;
		}
		while (lo < hi) {
			mid = Math.floor((lo + hi) / 2);
			if (x <= this[mid].id) {
				hi = mid;
			}
			else {
				lo = mid + 1;
			}
		}
		return lo;
	}
	
	$([collection]).on("arrayChange", collectionObserver);
	
	$.ajax({
		url: url,
		type: "GET"
	}).done(function(response) {
		$([collection]).off("arrayChange", collectionObserver);
		for (var i = 0; i < response.collection.length; ++i) {
			collection.insort(createDynamicElement(response.collection[i], response.fields, url));
		}
		collection.fields = response.fields;
		$([collection]).on("arrayChange", collectionObserver)
	});
	
	return collection;
}

function createDynamicElement(element, fields, url) {
	dynamic_element = {};
	Object.defineProperty(dynamic_element, '_element', {
		value: element
	});
	Object.defineProperty(dynamic_element, '_url', {
		value: url
	});
	for (var i = 0; i < fields.length; ++i) {
		createDynamicProperty(dynamic_element, fields[i].name);
	}
	return dynamic_element;
}


function createDynamicProperty(dynamic_element, key) {
	var element = dynamic_element._element;
	var url = dynamic_element._url;
	Object.defineProperty(dynamic_element, key, {
		get: function() {
			if (element.hasOwnProperty("_init")) {
				$.ajax({
					url: url + "/" + element.id,
					type: "GET"
				}).done(function(response) {
					var keys = Object.keys(response.element);
					for (var i = 0; i < keys.length; ++i) {
						element[keys[i]] = response.element[keys[i]];
						$(dynamic_element).trigger("propertyChange", {
							path: keys[i],
							value: response.element[keys[i]],
							oldValue: undefined
						});
					}
				});
				delete element._init
			}
			return element[key];
		},
		set: function(value) {
			var old_value = element[key];
			element[key] = value;
			$.ajax({
				url: url + '/' + element.id + '/' + key,
				type: "PUT",
				data: {value: value}
			}).done(function(response) {
				if (!response.success) {
					element[key] = old_value;
					$(dynamic_element).trigger("propertyChange", {
						path: key,
						value: old_value,
						oldValue: value
					});
				}
			});
		},
		enumerable: true,
		configurable: true
	});
}

function collectionObserver(ev, eventArgs) {
	var collection = ev.target;
	if (eventArgs.change == "insert") {
		var element = {};
		for (var i = 0; i < collection.fields.length; ++i) {
			var key = collection.fields[i];
			element[key] = eventArgs.items[0][key];
		}
		$.ajax({
			url: collection.url,
			type: "POST",
			data: element
		}).done(function(response) {
			if (response.success) {
				element.id = response.id;
				collection[eventArgs.index] = createDynamicElement(eventArgs.items[0], collection.fields, collection.url);
			}
			else {
				delete collection[eventArgs.index];
			}
		});
	}
	else if (eventArgs.change == "remove") {
		var element = eventArgs.items[0];
		$.ajax({
			url: collection.url + '/' + element.id,
			type: "DELETE"
		}).done(function(response) {
			
		});
	}
}
