function initmap() {
	// Reitaku University, Chiba, Japan: 35.8256, 139.9542

	const map = new maplibregl.Map({
		container: 'map', // ID of your map container
		style: {
			version: 8,
			sources: {
				"google-satellite": {
					type: "raster",
					tiles: [
						"https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
					],
					tileSize: 256,
					attribution: "Map data &copy; <a href=\"https://www.google.com/intl/en_us/help/terms_maps/\" target=\"_blank\">Google</a>",
					maxzoom: 21
				}
			},
			layers: [
				{
					id: "google-satellite-layer",
					type: "raster",
					source: "google-satellite"
				}
			]
		},
		center: [139.955303, 35.833707],
		zoom: 16
	});
	
	// Add MapLibre's built-in zoom and rotation controls to the bottom right
	map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

	const markerMap = new Map(); // key: "lat,lon", value: [{ marker, item, popup }]

	// Category color map (update as requested)
	const categoryColors = {
		"イベント": "#e74c3c",   // red
		"体験": "#f1c40f",       // yellow
		"展示": "#3498db",       // blue
		"食べ物": "#ff9800",     // orange
		"場所": "#43c59e",       // green
		"交通": "#9b59b6"        // purple
	};
	const categoryIcons = {
		"イベント": "images/show.png",
		"体験": "images/Activity.png",
		"展示": "images/Exhibit.png",
		"食べ物": "images/food.png",
		"交通": "images/transportation.png"
	};
	const defaultColor = "#43c59e";

	// Store markers by category for toggling
	const categoryMarkers = {};

	// --- Create legend container in HTML first ---
	let legend = document.getElementById('category-legend');
	let legendToggleBtn = document.getElementById('category-legend-toggle-btn');
	if (!legendToggleBtn) {
		legendToggleBtn = document.createElement('button');
		legendToggleBtn.id = 'category-legend-toggle-btn';
		legendToggleBtn.textContent = 'カテゴリ表示';
		legendToggleBtn.style.position = 'absolute';
		legendToggleBtn.style.top = '32px';
		legendToggleBtn.style.left = '16px';
		legendToggleBtn.style.zIndex = 31;
		legendToggleBtn.style.padding = '8px 16px';
		legendToggleBtn.style.borderRadius = '6px';
		legendToggleBtn.style.border = '1px solid #ccc';
		legendToggleBtn.style.background = '#fff';
		legendToggleBtn.style.cursor = 'pointer';
		legendToggleBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
		document.body.appendChild(legendToggleBtn);
	}

	if (!legend) {
		legend = document.createElement('div');
		legend.id = 'category-legend';
		legend.style.position = 'absolute';
		legend.style.top = '80px';
		legend.style.left = '16px';
		legend.style.background = '#fff';
		legend.style.border = '1px solid #ccc';
		legend.style.borderRadius = '8px';
		legend.style.padding = '12px 16px';
		legend.style.zIndex = 30;
		legend.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
		legend.style.display = 'none'; // Hide by default

		const title = document.createElement('b');
		title.textContent = 'カテゴリ';
		legend.appendChild(title);
		legend.appendChild(document.createElement('br'));

		// --- Add "Show All" checkbox ---
		const showAllLabel = document.createElement('label');
		showAllLabel.style.display = 'flex';
		showAllLabel.style.alignItems = 'center';
		showAllLabel.style.margin = '4px 0';
		showAllLabel.style.cursor = 'pointer';

		const showAllCheckbox = document.createElement('input');
		showAllCheckbox.type = 'checkbox';
		showAllCheckbox.id = 'legend-toggle-showall';
		showAllCheckbox.checked = true;
		showAllCheckbox.style.marginRight = '6px';

		const showAllText = document.createElement('span');
		showAllText.textContent = 'すべて表示';

		showAllLabel.appendChild(showAllCheckbox);
		showAllLabel.appendChild(showAllText);
		legend.appendChild(showAllLabel);

		showAllCheckbox.addEventListener('change', function() {
			const visible = this.checked;
			// Set all category checkboxes and markers to match
			Object.keys(categoryMarkers).forEach(categoryKey => {
				const cb = document.getElementById(`legend-toggle-${categoryKey}`);
				if (cb) cb.checked = false; // Uncheck all other category checkboxes
				(categoryMarkers[categoryKey] || []).forEach(marker => {
					const el = marker.getElement();
					el.style.display = visible ? '' : 'none';
				});
			});
		});

		document.body.appendChild(legend);
	}

	// Toggle legend visibility on button click
	legendToggleBtn.onclick = function() {
		legend.style.display = (legend.style.display === 'none' ? 'block' : 'none');
	};

	// Track which categories have been added to the legend
	const legendCategories = new Set();

	if (Array.isArray(dataObject)) {
		// Group items by lat/lon for spiderfy by category
		const latLonGroups = {};
		dataObject.forEach(item => {
			const lat = Number(item.lat);
			const lon = Number(item.lon);
			const key = `${lat},${lon}`;
			if (!latLonGroups[key]) latLonGroups[key] = [];
			latLonGroups[key].push(item);
		});

		Object.keys(latLonGroups).forEach(key => {
			const group = latLonGroups[key];
			const [lat, lon] = key.split(',').map(Number);
			// Group by category at this lat/lon
			const cats = group.map(item => (item.category || "場所").trim());
			const uniqueCats = Array.from(new Set(cats));
			const count = uniqueCats.length;
			const spiderfyRadius = 0.00012; // ~13m

			group.forEach(item => {
				const cat = (item.category || "場所").trim();
				const color = categoryColors[cat] || defaultColor;
				const iconUrl = categoryIcons[cat] || null;

				// Offset by category index
				let markerLat = lat;
				let markerLon = lon;
				if (count > 1) {
					const idx = uniqueCats.indexOf(cat);
					const angle = (2 * Math.PI * idx) / count;
					markerLat = lat + Math.sin(angle) * spiderfyRadius;
					markerLon = lon + Math.cos(angle) * spiderfyRadius;
				}

				// --- Add category to legend if not already present ---
				if (!legendCategories.has(cat)) {
					const id = `legend-toggle-${cat}`;
					const label = document.createElement('label');
					label.style.display = 'flex';
					label.style.alignItems = 'center';
					label.style.margin = '4px 0';
					label.style.cursor = 'pointer';

					const checkbox = document.createElement('input');
					checkbox.type = 'checkbox';
					checkbox.id = id;
					checkbox.checked = false; // Make category checkboxes unchecked by default
					checkbox.style.marginRight = '6px';

					const colorDot = document.createElement('span');
					colorDot.style.display = 'inline-block';
					colorDot.style.width = '16px';
					colorDot.style.height = '16px';
					colorDot.style.background = color;
					colorDot.style.borderRadius = '50%';
					colorDot.style.marginRight = '8px';
					colorDot.style.border = '1px solid #aaa';

					const catName = document.createElement('span');
					catName.textContent = cat;

					label.appendChild(checkbox);
					label.appendChild(colorDot);
					label.appendChild(catName);

					legend.appendChild(label);

					checkbox.addEventListener('change', function() {
						if (this.checked) {
							// Hide all other categories, show only this one
							Object.keys(categoryMarkers).forEach(categoryKey => {
								const show = categoryKey === cat;
								(categoryMarkers[categoryKey] || []).forEach(marker => {
									const el = marker.getElement();
									el.style.display = show ? '' : 'none';
								});
								// Set checkbox state to reflect visibility
								const cb = document.getElementById(`legend-toggle-${categoryKey}`);
								if (cb) cb.checked = show;
							});
							// Uncheck "Show All" if only one is shown
							const showAllCb = document.getElementById('legend-toggle-showall');
							if (showAllCb) showAllCb.checked = false;
						} else {
							// Hide this category only
							(categoryMarkers[cat] || []).forEach(marker => {
								const el = marker.getElement();
								el.style.display = 'none';
							});
							// Uncheck "Show All" if any category is hidden
							const showAllCb = document.getElementById('legend-toggle-showall');
							if (showAllCb) showAllCb.checked = false;
						}
					});

					legendCategories.add(cat);
				}
				// --- end legend creation ---

				let marker;
				if (iconUrl) {
					const el = document.createElement('div');
					el.style.width = '48px';
					el.style.height = '48px';
					el.style.background = 'none';
					el.style.display = 'flex';
					el.style.alignItems = 'center';
					el.style.justifyContent = 'center';

					const img = document.createElement('img');
					img.src = iconUrl;
					img.style.width = '44px';
					img.style.height = '44px';
					img.style.display = 'block';
					img.style.objectFit = 'contain';

					el.appendChild(img);

					marker = new maplibregl.Marker({ element: el })
						.setLngLat([markerLon, markerLat])
						.addTo(map);
				} else {
					marker = new maplibregl.Marker({ color })
						.setLngLat([markerLon, markerLat])
						.addTo(map);
				}

				const popup = new maplibregl.Popup({ offset: 25 })
					.setHTML(
						`<strong>${item.title}</strong><br>` +
						`${item.explanation}<br>` +
						(item.location ? `<em>Location:</em> ${item.location}<br>` : '') +
						(item.organizer ? `<em>Organizer:</em> ${item.organizer}` : '')
					);

				marker.getElement().addEventListener('mouseenter', () => popup.addTo(map).setLngLat([markerLon, markerLat]));
				marker.getElement().addEventListener('mouseleave', () => popup.remove());

				marker.getElement().addEventListener('click', (e) => {
					map.easeTo({ center: [markerLon, markerLat], duration: 180 });

					// Remove any existing custom popups
					document.querySelectorAll('.custom-slide-popup').forEach(p => p.remove());

					// Create custom sliding popup
					const popupDiv = document.createElement('div');
					popupDiv.className = 'custom-slide-popup';
					popupDiv.style.position = 'fixed';
					popupDiv.style.top = '80px';
					popupDiv.style.right = '-340px';
					popupDiv.style.width = '320px';
					popupDiv.style.background = '#fff';
					popupDiv.style.color = '#000';
					popupDiv.style.zIndex = 100;
					popupDiv.style.boxShadow = '-2px 0 8px rgba(63, 61, 61, 0.12)';
					popupDiv.style.padding = '24px 20px 20px 20px';
					popupDiv.style.borderRadius = '8px';
					popupDiv.style.transition = 'right 0.35s cubic-bezier(.4,0,.2,1)';
					popupDiv.innerHTML = `
						<button id="close-custom-popup" style="position:absolute;top:8px;right:12px;font-size:20px;background:none;border:none;color:#000;cursor:pointer;">×</button>
						<h2 style="margin-top:0;">${item.title}</h2>
						${item.location ? `<div><b>場所:</b> ${item.location}</div>` : ''}
						${item.organizer ? `<div><b>主催:</b> ${item.organizer}</div>` : ''}
						${item.explanation ? `<div style="margin-top:12px;">${item.explanation}</div>` : ''}
					`;
					document.body.appendChild(popupDiv);

					// Slide in
					setTimeout(() => { popupDiv.style.right = '16px'; }, 10);

					// Close logic: slide out to left then remove
					document.getElementById('close-custom-popup').onclick = () => {
						popupDiv.style.right = '-340px';
						setTimeout(() => { popupDiv.remove(); }, 350);
					};

					// Optional: close popup when clicking outside
					setTimeout(() => {
						document.addEventListener('mousedown', function handler(ev) {
							if (!popupDiv.contains(ev.target)) {
								popupDiv.style.right = '-340px';
								setTimeout(() => { popupDiv.remove(); }, 350);
								document.removeEventListener('mousedown', handler);
							}
						});
					}, 100);

					// Remove default popup if present
					popup.remove();
				});

				const origKey = `${lat},${lon}`;
				if (!markerMap.has(origKey)) markerMap.set(origKey, []);
				markerMap.get(origKey).push({ marker, item, popup, lat: markerLat, lon: markerLon });

				if (!categoryMarkers[cat]) categoryMarkers[cat] = [];
				categoryMarkers[cat].push(marker);
			});
		});
	}

	// Attach spiderfy to every marker with duplicate positions
	markerMap.forEach((markerArr, key) => {
		if (markerArr.length <= 1) return;
		markerArr.forEach(({ marker, lat, lon }) => {
			marker.getElement().addEventListener('click', (e) => {
				e.stopPropagation();
				map.easeTo({ center: [lon, lat], duration: 180 });
				// spiderfy(markerArr, lat, lon); // Commented out because not defined
			});
		});
	});


	// Add GeolocateControl to the map and move it to the top-right position
	const geolocate = new maplibregl.GeolocateControl({
		positionOptions: { enableHighAccuracy: true },
		trackUserLocation: true,
	});
	map.addControl(geolocate, 'top-right');

	// Change the GeolocateControl button slightly bigger
	map.on('load', () => {
		const geoBtn = document.querySelector('.maplibregl-ctrl-top-right .maplibregl-ctrl-geolocate');
		if (geoBtn) {
			geoBtn.style.transform = 'scale(1.4)';
			geoBtn.style.marginBottom = '12px';
		}
	});

	// --- Search bar logic ---
	const searchInput = document.getElementById('search-input');
	const searchBtn = document.getElementById('search-btn');
	if (searchInput && searchBtn) {
		const doSearch = () => {
			const q = searchInput.value.trim().toLowerCase();
			if (!q) return;
			let found = false;
			markerMap.forEach(markerArr => {
				markerArr.forEach(({ marker, item, lat, lon }) => {
					if (
						(item.title && item.title.toLowerCase().includes(q)) ||
						(item.location && item.location.toLowerCase().includes(q))
					) {
						map.easeTo({ center: [lon, lat], zoom: 17, duration: 400 });
						marker.getElement().click();
						found = true;
						return false;
					}
				});
				if (found) return false;
			});
			if (!found) {
				searchInput.style.background = "#ffeaea";
				setTimeout(() => { searchInput.style.background = ""; }, 800);
			}
		};
		searchBtn.onclick = doSearch;
		searchInput.onkeydown = e => { if (e.key === "Enter") doSearch(); };
	}
}
		searchBtn.onclick = doSearch;
		searchInput.onkeydown = e => { if (e.key === "Enter") doSearch(); };

			geoBtn.style.transform = 'scale(1.4)';
			geoBtn.style.marginBottom = '12px';

	// Trigger geolocation and tracking when the custom button is clicked
	document.getElementById('geolocate-btn').onclick = () => {
		geolocate.trigger();
	};

	
	const searchBtn = document.getElementById('search-btn');
	if (searchInput && searchBtn) {
		const doSearch = () => {
			const q = searchInput.value.trim().toLowerCase();
			if (!q) return;
			let found = false;
			markerMap.forEach(markerArr => {
				markerArr.forEach(({ marker, item, lat, lon }) => {
					if (
						(item.title && item.title.toLowerCase().includes(q)) ||
						(item.location && item.location.toLowerCase().includes(q))
					) {
						map.easeTo({ center: [lon, lat], zoom: 17, duration: 400 });
						marker.getElement().click();
						found = true;
						return false;
					}
				});
				if (found) return false;
			});
			if (!found) {
				searchInput.style.background = "#ffeaea";
				setTimeout(() => { searchInput.style.background = ""; }, 800);
			}
		};
		searchBtn.onclick = doSearch;
		searchInput.onkeydown = e => { if (e.key === "Enter") doSearch(); };
	}


