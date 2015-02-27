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
            localStorage['data'] = JSON.stringify(data);
            localStorage['session_id'] = data['session_id'];
            alert('Benvenuto ' + user + '!');
            window.location = 'play.html';
        });
    });
});