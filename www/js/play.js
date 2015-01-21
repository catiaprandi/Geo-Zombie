var map, panorama, gpsTracker;
var playerMarker = null;

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        console.log('Device ready!');
    },
};

function initialize() {
    
    var panoramaOptions = {
        visible: false,
        enableCloseButton : true
    };
    
    panorama = new google.maps.StreetViewPanorama($('#pano-canvas'), panoramaOptions);

    var mapOptions = {
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        //disableDefaultUI: true,
        streetView : panorama
    };
    
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    
    var cesenaLatLng = new google.maps.LatLng(44.1492013, 12.2624634);
    map.setCenter(cesenaLatLng);

    // Try HTML5 geolocation
    if(navigator.geolocation) {
        gpsTracker = navigator.geolocation.watchPosition(function(position) {
            var pos = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);

            if (playerMarker === null)
            {
                // Place player's marker
                playerMarker = new google.maps.Marker({
                  position: pos,
                  map: map,
                  icon: 'img/marker/player.png',
                });
                
                playerMarker.circle = new google.maps.Circle({
                    map: map,
                    center: playerMarker.getPosition(),
                    radius: 250,    // 10 miles in metres
                });
                
                playerMarker.circle.bindTo('center', playerMarker, 'position');

                map.setCenter(pos);
                
            }
        }, function() {
            alert("Nessuna posizione rilevata.");
        }, {
            enableHighAccuracy: true, 
            maximumAge        : 30000, 
            timeout           : 27000
        });
    } else {
        // Browser doesn't support Geolocation
        alert('Il tuo browser non supporta la geolocalizzazione!');
    }

    google.maps.event.addListener(panorama, "visible_changed", function() {
        if (panorama.getVisible() && $("#pano-canvas").is(':visible')){
            //moving the pegman around the map
        }else if(panorama.getVisible() && $("#pano-canvas").is(':hidden')){
            alert("test");
            $("#pano-canvas").show();          
            $("#map-canvas").removeClass('bigmap');
            $("#map-canvas").addClass('minimap');
        }
        google.maps.event.addListener(panorama, "closeclick", function() {
            $("#pano-canvas").hide();  
            $("#map-canvas").removeClass('minimap');
            $("#map-canvas").addClass('bigmap');        
        });
      }); 
}

function updateTimer(){
    timeSpent++;
    var min = Math.floor(timeSpent/60).toString();
    var sec = Math.round(timeSpent%60).toString();
    if(min.length<2){
        min = "0"+min;
    }
    if(sec.length<2){
        sec = "0"+sec;
    }
    //document.getElementById("timer").innerHTML = "TIME ALIVE: <strong>"+min+":"+sec+"</strong>";
    if(timeSinceMove>4){
        checkZombies();
        timeSinceMove = 0;
    }
}

$( initialize );