$(document).ready(function() {
$( window ).resize(function() {
var viewportHeight = $( window ).height();
var viewportWidth = $( window ).width();
var controlWidth = viewportHeight/5;
var containerWidth = viewportWidth-controlWidth
var controlHeight = controlWidth;
$('#map-container').css('width', containerWidth);
$('#controls').css('width', controlWidth);
$('.control-button').css('height', controlHeight);
});
$(window).resize();
});