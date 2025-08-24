// Inicializar mapa
var map = L.map('map');

// Limites aproximados do bairro Tijucal
var tijucalBounds = L.latLngBounds(
  L.latLng(-15.657, -56.105), // sudoeste
  L.latLng(-15.645, -56.090)  // nordeste
);

// Abrir mapa centralizado no bairro Tijucal
map.fitBounds(tijucalBounds);

// Camada base OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var ruasLayer;
var selecionado = null;

// Estilo padrão
function estiloRua(feature) {
  return {
    color: "red",
    weight: 3
  };
}

// Função ao clicar em rua
function onEachRua(feature, layer) {
  layer.on('click', function () {
    if (selecionado) {
      selecionado.setStyle({weight: 3});
    }
    selecionado = layer;
    layer.setStyle({weight: 6});
    layer.bindPopup(feature.properties.name || feature.properties.id).openPopup();
  });
}

// Buscar ruas do bairro Tijucal
fetch(`
https://overpass-api.de/api/interpreter?data=
[out:json][timeout:25];
area["name"="Tijucal"]["boundary"="administrative"]->.a;
way(area.a)["highway"];
out geom;
`)
.then(res => res.json())
.then(data => {
  // Adiciona ID único para cada rua para salvar corretamente
  data.elements.forEach((el, idx) => {
    el.tags = el.tags || {};
    el.tags.__id = el.id || idx; // garante ID único
  });

  ruasLayer = L.geoJSON(osmToGeoJSON(data), {
    style: estiloRua,
    onEachFeature: onEachRua
  }).addTo(map);

  // Restaurar progresso salvo
  var salvo = JSON.parse(localStorage.getItem("ruasFeitas")) || {};
  ruasLayer.eachLayer(function(layer){
    var chave = layer.feature.properties.name || layer.feature.properties.id;
    if (salvo[chave] === "feita") {
      layer.setStyle({color: "green", weight: 4});
      layer.options.status = "feita";
    } else {
      layer.setStyle({color: "red", weight: 3});
      layer.options.status = "fazer";
    }
  });
});

// Converter OSM para GeoJSON
function osmToGeoJSON(osmData) {
  var features = osmData.elements.map(function(el){
    if(el.type === "way" && el.geometry){
      return {
        type: "Feature",
        properties: { 
          name: el.tags && el.tags.name ? el.tags.name : null,
          id: el.tags && el.tags.__id ? el.tags.__id : el.id
        },
        geometry: {
          type: "LineString",
          coordinates: el.geometry.map(p => [p.lon, p.lat])
        }
      };
    }
  }).filter(f => f !== undefined);
  return { type: "FeatureCollection", features: features };
}

// Botões
function marcarFeita() {
  if (selecionado) {
    selecionado.setStyle({color:"green", weight:4});
    selecionado.options.status="feita";
  } else {
    alert("Selecione uma rua do Tijucal primeiro.");
  }
}

function marcarFazer() {
  if (selecionado) {
    selecionado.setStyle({color:"red", weight:3});
    selecionado.options.status="fazer";
  } else {
    alert("Selecione uma rua do Tijucal primeiro.");
  }
}

function limparSelecao() {
  if (selecionado) {
    selecionado.setStyle({weight:3});
    selecionado = null;
  }
}

function salvarProgresso() {
  var progresso = {};
  ruasLayer.eachLayer(function(layer){
    var chave = layer.feature.properties.name || layer.feature.properties.id;
    progresso[chave] = layer.options.status || "fazer";
  });
  localStorage.setItem("ruasFeitas", JSON.stringify(progresso));
  alert("Progresso salvo!");
}

// Barra de busca restrita ao bairro Tijucal
L.Control.geocoder({
  defaultMarkGeocode: true,
  bounds: tijucalBounds
}).addTo(map);
