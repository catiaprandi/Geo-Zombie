$(document).ready(function() {
    $('#login-form').submit(function( e ) {
        e.preventDefault();
        var user = $('#username').val();
        var sex = $('input[name=sex]:checked', '#login-form').val();
        $.ajax({
            url: 'http://robotex.altervista.org/tesi/index.php',
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