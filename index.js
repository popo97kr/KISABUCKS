var express = require('express');
var app = express();
var dbconn = require('./routes/database/database');
var request = require('request');
var appdata = require('./appdata.json');
var path = require('path');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

var accessKey = "8fd73197-6356-45b7-b197-a219e9ae034b";//user의 accessKey로 받아야함. 동적 할당
var refreash = "189cce5d-65c7-4daf-b6a5-3835626b3a0c";
var userNum = "1100034731";//회원의 userNum으로 로그인

var signedin= 0;

//main page
app.get('/', function (req, res) {
    if(signedin == 1)
    {
        dbconn.pool.getConnection(function(err,conn){
            if(err){
                console.error(err)
                throw err
            }
            else{
                var sql = 'SELECT cafe_name, cafe_pic from cafe'
                conn.query(sql, function(error, results, fields){
                    if (error){ 
                        throw error;
                    }
                    else{
                        res.render('loggedindex', {results : results});
                    }
                })
            }
        })    
        
    }
    else{
        dbconn.pool.getConnection(function(err,conn){
            if(err){
                console.error(err)
                throw err
            }
            else{
                var sql = 'SELECT cafe_name, cafe_pic from cafe'
                conn.query(sql, function(error, results, fields){
                    if (error){ 
                        throw error;
                    }
                    else{
                        res.render('index', {results : results});
                    }
                })
            }
        })
    }  
});

app.get('/location',function(req,res){
    res.render('location');
})

app.get('/mypage',function(req,res){
    dbconn.pool.getConnection(function(err,conn){
        if(err){
            console.error(err)
            throw err
        }
        else{
            var sql = 'SELECT * from memo'
            conn.query(sql, function(error, results, fields){
                if (error){ 
                    throw error;
                }
                else{
                    res.render('mypage', {results : results});
                }
            })
        }
    })    
})

app.post('/logout', function(req,res){
    signedin=0;
    console.log(signedin);
    res.json(1);
})


//signup
app.get('/signup', function(req,res){
    res.render('signup');
})

app.post('/register',function(req,res){
    var name = req.body.name;
    var id = req.body.userID;
    var pw = req.body.password;
    var UN = req.body.use_num;
    var AT = req.body.accessToken;

    var sql = 
    "INSERT INTO user (user_name, user_id, user_pw, user_accesstoken, user_userNum) VALUES (?,?,?,?,?)";
    dbconn.pool.getConnection(function(err,conn){
        if(err){
            console.error(err)
            throw err
        }
        else{
            conn.query(sql, [name, id, pw, AT, UN], //authResult에서 나온 결과 저장
                function (err, result){
                    if(err){
                        console.error(err);
                        throw err;
                    }
                    else{
                        console.log(result);
                        conn.release();
                        res.json(1);
                    }
                })
            }
        })
});

app.get('/authResult',function(req,res){
    console.log(req.query.code);
    console.log(req.query.scope);

    var option = {
        method : 'POST',
        url : "https://testapi.open-platform.or.kr/oauth/2.0/token",
        headers: {
              "Content-type" : "application/x-www-form-urlencoded; charset=UTF-8"
            },
    form : {
        code : req.query.code,
        client_id : "l7xx4460923980ef49c5a21acfaa60559817",
        client_secret :"5034c3ad454c455aa3a48415ae34177d",
        redirect_uri :"http://localhost:3000/authResult",
        grant_type : "authorization_code"
       }
    };
    console.log(option.form);
    request(option, function(err, result, body){
        if(err){
            console.log(err);
             throw new Error(error);
        }
        else {
            console.log(body);
            var authData = JSON.parse(body);
            res.render('authComplete',{authData:authData});
        }   
    });
})


//login
app.get('/login', function(req,res){
    res.render('login');
});

app.post('/logincheck',function(req,res){
    var id = req.body.userID;
    var pw = req.body.password;
    console.log(id, pw)
    dbconn.pool.getConnection(function(err,conn){
        if(err){
            console.error(err)
            throw err
        }
        else{
            conn.query("SELECT * FROM user WHERE user_id=?",[id], 
            function(error, results, fields){
                if (error){ 
                    throw error;
                }
                else{
                    console.log(results)
                    if(results.length > 0) {
                        if(results[0].user_pw == pw) {
                            console.log("성공")
                            signedin = 1;
                            res.json(1);
                        } else {
                            res.send({
                                "code": 204,
                                "success": "Email and password does not match"
                            });
                        }
                    } else {
                        res.send({
                            "code":204,
                            "success": "Email does not exists"
                        });
                    }
                }    
            }) 
     
                
                }
            })
        }
);

app.post('/menu', function (req, res) {
    var mid = req.body.mid.split(",");
    console.log(mid.length)
    var sql2 = ''
    if (mid.length == 1){
        var sql = "select * from menu where mid= ?"

    }

    else if (mid.length == 2){
        var sql = "select * from menu where mid= ? or mid=?"

    }
    dbconn.pool.getConnection(function (err, conn) {
         if (err) {
            console.error(err);
            throw err;
        } 
        else {
            conn.query(sql, mid, function (err, result, fields) {
                console.log(result)
                res.json(result);
                conn.release();
            })
        }
    })


})

app.get('/payment', function (req, res) {
   console.log(req.query.mid.toString())
    var options = {
        url: "http://localhost:3000/menu",
        method: "POST",
        form: {
            'mid' : req.query.mid.toString()

        }
    };

    request(options, function (error, response, body) {
        if (error) {
            console.error(error);
            throw error;
        }

        else {
            var menu = JSON.parse(body)
            res.render('payment', {data : menu})
        }

    });

});


//cafe detail
app.get('/cafe/detail/:number', function (req, res) {
    var sql = 'select * from cafe join menu on cafe.cid = menu.cid where cafe.cid = ?'
    
    dbconn.pool.getConnection(function (err, conn) {
        if (err) {
            console.error(err);
            throw err;
        } else {
            conn.query(sql, [req.params.number], function (err, result, fields) {
                

                res.render("cafe-detail", {
                    data : result
                });
                conn.release();
            })
        }
    })

  
});

//payment detail 

app.post('/withdraw', function (req, res) {
    // 결제 금액을 변수 값에 저장하고 있다가 출금이체 API를 통해 잔액을 그 값을 변수에 넣어서 빼주고 나머지 값을 DB에 저장하는식
    console.log(req.body.price);
    var getUserDataURI = 'https://testapi.open-platform.or.kr/transfer/withdraw'; // 토큰을 받을 수 있는 restful url
    var options = {
        url: getUserDataURI,
        json: true,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Bearer ' + accessKey
        },
        body: {
            dps_print_content: '통장기재내용', //금결원의 내용과 똑같아야함
            fintech_use_num: '199003892057724727972231', //조회하고자 하는 fintech_use_num을 입력
            print_content: '통장기재내용',
            tran_amt: 1000, // 출금금액
            tran_dtime: '20190219131000'
        }
    };
    request(options, function (err, response, body) {
        if (err) {
            console.error(err);
            throw err;
        } else {

            console.log(body);
        }
    })
});

app.post('/paid',function(req,res){
    var paid = req.body.paid;
    res.json(1);
});
//기본적인 url..? 포맷 넣어놨고 필요에 따라 추가하시면 될 것 같아요!

var server = app.listen(3000, function () {
    console.log("Express server has started on port 3000")
});
