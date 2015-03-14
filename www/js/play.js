var map, panorama, gpsTracker;
var dirService;
var playerMarker;
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
var positionTracked = false;
var totalZombies = 15;

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

function Zombie(pos) {
    
    var health; // Zombie's health

    var route;
    var moveInt;
    var imNew = true;
    var imgW = 139;
    var imgH = 373;
    var smallMult = 0.5; //0.05;
    var anchorMult = 0.4;

    var zombieSprites = [
        {
            file:'img/zombie/zombie4.png',
            width:244,
            height:708,
            speed: 1,
            anchorMult:0.3
        },
        {
            file:'img/zombie/zombie5.png',
            width:437,
            height:664,
            speed: 1,
            anchorMult:0.4
        },
        {
            file:'img/zombie/zombie6.png',
            width:413,
            height:420,
            speed: 1,
            anchorMult:0.6
        }
    ];

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
    var health = 100;
    
    function setVisible(flag) {
        mapMarker.setVisible(flag);
        panoramaMarker.setVisible(flag && game.isPanoramaView() ? flag : !flag);
    }
    
    function isDead() {
        return ((health <= 0) ? true : false);
    }
    
    function spawn() {
        imNew = true;
        health = 100;
        var center = playerMarker.getPosition();
        var heading = Math.random()*360;
        var dist = playerBuffer + (Math.random()*(zombieDistributionRange-playerBuffer));
        var pos = google.maps.geometry.spherical.computeOffset(center,dist,heading);
        mapMarker.setPosition(pos);
        panoramaMarker.setPosition(pos);
        setVisible(true);
    }
    
    function setPosition(pos) {
        mapMarker.setPosition(pos);
        panoramaMarker.setPosition(pos);
        var dist = google.maps.geometry.spherical.computeDistanceBetween(getPosition(),playerMarker.getPosition());

        if (dist<dieRadius) {
            playerData['health'] = playerData['health'] - 25;
            updateHealthImage();
            if (playerData['health'] <= 0) {
                stopMove();
                //gameOver(getPosition());
            } else {
                spawn();
            }
        }
        // Uno zombie è dentro la visuale
        if(dist<=zombieVisibleRadius){
            if (zombiesInVisibleRadius == false) {
                panorama.setVisible(true);
                playerMarker.circle.setOptions({
                    strokeColor: 'red',
                    fillColor: 'red'
                });
                game.toggleView();
            }
            zombiesInVisibleRadius = true;
            panoramaMarker.setVisible(true);
        }
    }
    
    function getPosition() {
        return mapMarker.getPosition();
    }

     // Get directions to player
    function getDirections(){
        var dirReq = {
            origin:mapMarker.getPosition(),
            destination: playerMarker.getPosition(),
            travelMode: google.maps.DirectionsTravelMode.WALKING
        };
        dirService.route(dirReq,function(result,status) {
            if (status == google.maps.DirectionsStatus.OK) {
                route = result.routes[0].overview_path;
                if (imNew) {
                    setPosition(route.shift());
                    imNew=false;
                } else {
                    route[0]=getPosition();
                }
            }
        });
    }
    
    function redirect() {
        getDirections();
    }

    function startMove() {
        if(route && !moveInt){
            moveInt = setInterval(move,1000/FPS);
        }
       
    }
    function stopMove() {
        if(moveInt){
            clearInterval(moveInt);
            moveInt = null;
        }
    }
    
    function move() {
        var newZombPos;
        if (route.length>0) {
            if (isPaused)
                return;
            if (getPosition()==route[0]) {
                route.shift();
            }
            if (route[0]) {
                var nextX = route[0].lat();
                var nextY = route[0].lng();
                var zombieX = getPosition().lat();
                var zombieY = getPosition().lng();
                var crowLength = Math.sqrt(Math.pow(zombieX-nextX,2)+Math.pow(zombieY-nextY,2));
                if(zombieMoveDist>crowLength){
                    newZombPos = route[0];
                }
                else{
                    var pctMove = zombieMoveDist/crowLength;
                    var newX = zombieX-(pctMove * (zombieX-nextX));
                    var newY = zombieY-(pctMove * (zombieY-nextY));
                    newZombPos = new google.maps.LatLng(newX,newY);
                }
               setPosition(newZombPos);
            }
        }
        else
        {
            clearInterval(moveInt);
        }
    }
    
    function isInPlayerVisibleRadius() {
        return (google.maps.geometry.spherical.computeDistanceBetween(mapMarker.getPosition(), playerMarker.getPosition()) <= zombieVisibleRadius);
    }
    
    // Run once
    google.maps.event.addListener(panoramaMarker, 'click', function() {
        //hit();
    });
    
    return {
        getPosition:getPosition,
        startMove:startMove,
        stopMove:stopMove,
        redirect:redirect,
        isDead:isDead,
        isInPlayerVisibleRadius:isInPlayerVisibleRadius,
        spawn:spawn,
    };
}

function mainLoop() {
    var zom;
    var dist;
    redirects = 0;
    var i;
    for(i in zombies){
        zom = zombies[i];
        dist = google.maps.geometry.spherical.computeDistanceBetween(zom.getPosition(),playerMarker.getPosition());
        if(dist<zombieAwareRadius){
            redirects++;
            if(redirects<80){
                zom.redirect();
            }
            zom.startMove();
        }else if(dist>zombieAsleepRadius){
            zom.stopMove();
        }
    }
}

var game = {
    init : function() {
    
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
                
                if (!positionTracked) {
                    positionTracked = true;
                    game.start();
                }

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
    
    start : function() {
        game.createZombies();
    },
    
    createZombies : function() {
        var newZombie;
        var i;
        for(i=1;i<=totalZombies;i++) {
            newZombie = new Zombie();
            newZombie.spawn();
            zombies.push(newZombie);
        }
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
    
    isPanoramaView : function () {
        return !$("#map-canvas").hasClass('bigmap');
    }
}

$( game.init );