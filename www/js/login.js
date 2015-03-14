$(document).ready(function() {
    $('#login-form').submit(function( e ) {
        e.preventDefault();
        var user = $('#username').val();
        if (!user) {
            alert('Per favore, digitare nome utente.');
            return;
        }
        var sex = $('input[name=sex]:checked', '#login-form').val();
        $.ajax({
            url: 'http://137.204.74.226/Geo-Zombie/index.php',
            jsonp: 'callback',
            dataType: 'jsonp',
            data: { username : user }
        }).done(function( data ) {
            data['sex'] = sex;
            user = data['username'];
            localStorage['data'] = JSON.stringify(data);
            localStorage['session_id'] = data['session_id'];
            alert('Benvenuto ' + user + '!');
            window.location = 'play.html';
        });
    });
});