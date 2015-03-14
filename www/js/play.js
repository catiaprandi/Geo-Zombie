var map, panorama, gpsTracker;
var dirService;
var playerMarker = null;
var zombies = [];
var timeSpent = 0;
var totalMoves = 0;
var playerBuffer = 180;
var timeInt;
var FPS = 5;
var fpsInt = 1000/FPS;
var zombieMoveDist = 0.00001;
var zombieDistributionRange = 1000;
var zombieAwareRadius = 500;
var zombieAsleepRadius = 700;
var zombieVisibleRadius = 150;
var zombiesInVisibleRadius = false;
var dieRadius = 5;
var aniFinish;
var aniAmt = 10;
var povAniInt;
var playerData;
var isPaused = false;
var healthPrice = 25;
var powerPrice = 50;

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

function Zombie() {
    var mapMarker = new google.maps.Marker({
        map: map,
        icon: 'img/marker/zombie.png'
    });
    var panoramaMarker = new google.maps.Marker({
        map: panorama,
        visible: false,
        //icon: image,
        clickable: true
    });
}

function mainLoop() {
    
}

var game = {
    initialize : function() {
    
        playerData = JSON.parse(localStorage['data']);
        
        // Initialize Google Maps and Street View
        dirService = new google.maps.DirectionsService();
        
        var panoramaOptions = {
            //visible: false,
            disableDoubleClickZoom:true,
            disableDefaultUI: true,
        };
        
        panorama = new google.maps.StreetViewPanorama(document.getElementById('panorama-canvas'), panoramaOptions);

        var mapOptions = {
            zoom: 16,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: true,
            draggable: false,
            disableDoubleClickZoom: true,
            streetView : panorama,
        };
        
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        
        var playerIcon = new google.maps.MarkerImage(
            playerData['sex'] == 'f' ? 'img/marker/player_female.png' : 'img/marker/player.png',
            null, /* size is determined at runtime */
            null, /* origin is 0,0 */
            null, /* anchor is bottom center of the scaled image */
            new google.maps.Size(62, 68)
        ); 
        
        playerMarker = new google.maps.Marker({
            map: map,
            icon: playerIcon,
        });
        
        playerMarker.circle = new google.maps.Circle({
            map: map,
            center: playerMarker.getPosition(),
            radius: zombieVisibleRadius,
        });
        
        playerMarker.circle.bindTo('center', playerMarker, 'position');

        // Try HTML5 geolocation
        if(navigator.geolocation) {
            gpsTracker = navigator.geolocation.watchPosition(function(position) {
                var pos = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
                
                playerMarker.setPosition(pos);
                panorama.setPosition(pos);
                map.setCenter(pos);
                

            }, function(error) {
                if (error.code == error.PERMISSION_DENIED)
                    alert("Non hai abilitato i permessi!");
                else
                    alert("Nessuna posizione rilevata.\n" + "[" + error.code + "] " + error.message);
            }, {
                enableHighAccuracy: true, 
                maximumAge        : 30000, 
                timeout           : 27000
            });
        } else {
            // Browser doesn't support Geolocation
            alert('Il tuo browser non supporta la geolocalizzazione!');
        }
        
        setInterval(mainLoop, 1000/FPS);
    },
    
    toggleView : function() {
        var currCenter = map.getCenter();
        if ($("#map-canvas").hasClass('bigmap')) {
            $("#map-canvas").removeClass('bigmap');
            $("#map-canvas").addClass('minimap');
        } else {
            $("#map-canvas").removeClass('minimap');
            $("#map-canvas").addClass('bigmap');
        }
        google.maps.event.trigger(map, 'resize');
        map.setCenter(currCenter);
    },
    
    savePlayerData : function() {
        $.ajax({
            url: 'http://robotex.altervista.org/tesi/index.php',
            type: 'POST',
            data: playerData
        });
    },
}

$( game.initialize );