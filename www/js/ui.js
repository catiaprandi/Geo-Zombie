$(document).ready(function() {
 $( window ).resize(function() {
 var viewportHeight = $( window ).height();
 var viewportWidth = $( window ).width();
 var controlWidth = (viewportHeight/5);
 $('#map-container').css('width', viewportWidth-controlWidth);
 });

 $(window).trigger('resize');
});