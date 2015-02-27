$(document).ready(function() {
    $('#login-form').submit(function( e ) {
        e.preventDefault();
        var user = $('#username').val();
        $.ajax({
            url: 'http://robotex.altervista.org/tesi/index.php',
            jsonp: 'callback',
            dataType: 'jsonp',
            data: { username : user }
        }).done(function( data ) {
            user = data['username'];
            localStorage['username'] = user;
            localStorage['data'] = data;
            alert('Benvenuto ' + user + '!');
            window.location = 'play.html';
        });
    });
});