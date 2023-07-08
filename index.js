var express = require('express');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var session = require('express-session');
const { render } = require('express/lib/response');
require('dotenv').config();
var app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.listen(process.env.PORT);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: "secret" }));

var pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

function isProductInCart(cart, id) {
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id == id) {
      return true;
    }
  }
  return false;
}

function calculateTotal(cart, req) {
  var total = 0;
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].sale_price) {
      total = total + cart[i].sale_price * cart[i].quantity;
    } else {
      total = total + cart[i].price * cart[i].quantity;
    }
  }
  req.session.total = total;
  return total;
}

app.get('/', function (req, res) {
  
  pool.query("SELECT * FROM product", (err, result) => {
    res.render('pages/index', { result: result });
  });
});

app.post('/add_to_cart', function (req, res) {
  var id = req.body.id;
  var name = req.body.name;
  var price = req.body.price;
  var sale_price = req.body.sale_price;
  var quantity = req.body.quantity;
  var image = req.body.image;
  var product = { id: id, name: name, price: price, sale_price: sale_price, quantity: quantity, image: image };

  if (req.session.cart) {
    var cart = req.session.cart;

    if (!isProductInCart(cart, id)) {
      cart.push(product);
    } else {
      req.session.cart = [product];
      var cart = req.session.cart;
    }
  } else {
    req.session.cart = [product];
    var cart = req.session.cart;
  }

  // calculate total
  calculateTotal(cart, req);

  // return to cart page
  res.redirect('/cart');
});


app.post('/remove_product', function (req, res) {
  var id = req.body.id;
  var name = req.body.name;
  var price = req.body.price;
  var sale_price = req.body.sale_price;
  var quantity = req.body.quantity;
  var image = req.body.image;
  var product = { id: id, name: name, price: price, sale_price: sale_price, quantity: quantity, image: image };

  if (req.session.cart) {
    var cart = req.session.cart;
      cart.pop();
    
  } else {
    req.session.cart = [product];
    var cart = req.session.cart;
  }

  // calculate total
  calculateTotal(cart, req);

  // return to cart page
  res.redirect('/cart');
});

app.get('/cart', function (req, res) {
  var cart = req.session.cart || [];
  var total = req.session.total || 0;

  res.render('pages/cart', { cart: cart, total: total });
});


app.post('/edit_product_quantity', function(req, res) {
    // Get values from input
    var id = req.body.id;
    var quantity = req.body.quantity;
    var increase_btn = req.body.increase_product_quantity;
    var decrease_btn = req.body.decrease_product_quantity;

    var cart = req.session.cart;

    if (increase_btn) {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id == id) {
                if (cart[i].quantity > 0) {
                    cart[i].quantity = parseInt(cart[i].quantity) + 1;
                }
            }
        }
    }

    if (decrease_btn) {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id == id) {
                if (cart[i].quantity > 1) {
                    cart[i].quantity = parseInt(cart[i].quantity) - 1;
                }
            }
        }
    }

    calculateTotal(cart, req);
    res.redirect('/cart');
});

var total1=0;
app.get('/checkout',function(req,res){
    var total = req.session.total;
    total1 = total;
    res.render('pages/checkout',{total:total});
})

app.post('/place_order',function(req,res){
var id = req.query.id;
var name = req.body.name;
var email = req.body.email;
var phone = req.body.phone;
var city = req.body.city;
var address = req.body.address;
var cost = total1;
var status = "not paid";
var date = new Date();
var products_ids = "";


  var cart = req.session.cart;
  for(let i=0; i< cart.length;i++){
    products_ids = products_ids + "," + cart[i].id;
  }

  pool.connect((err)=>{
    if(err){
        console.log(err);
    }else{
        var query = "INSERT INTO orders(cost, name, email, status, city, address, phone, date, products_ids) VALUES ?";
        var values = [
                 [cost, name, email, status, city, address, phone, date,products_ids]
            ];
        pool.query(query,[values],(err,result)=>{

            for(let i=0;i<cart.length;i++){
                var query = "INSERT INTO order_items(order_id, product_id, product_name, product_price, product_image, product_quantity, order_date) VALUES ?";
                var values = [
                    [id,cart[i].id, cart[i].name, cart[i].price, cart[i].image, cart[i].quantity, new Date()]
               ];
            }


            res.redirect('/payment');
        })
    }
  })


})

app.get('/payment',function(req,res){
    var total = total1;
    res.render('pages/payment',{total:total}) 
})


app.get('/single_product',function(req,res){
    var id = req.query.id;
    
      pool.query("SELECT * FROM product WHERE id='"+id+"'", (err, result) => {
        res.render('pages/single_products', { result: result });
      });
})


app.get('/products',function(req,res){
  
      pool.query("SELECT * FROM product", (err, result) => {
        res.render('pages/products', { result: result });
      });


})


app.get('/about',function(req,res){
    res.render('pages/about') 
})
