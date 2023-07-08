const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret' }));

// Helper function to check if a product is already in the cart
function isProductInCart(cart, id) {
  return cart.some(item => item.id === id);
}

// Helper function to calculate the total price of the items in the cart
function calculateTotal(cart, req) {
  let total = 0;
  cart.forEach(item => {
    total += (item.sale_price || item.price) * item.quantity;
  });
  req.session.total = total;
  return total;
}

app.get('/', function (req, res) {
  const con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  con.query('SELECT * FROM product', (err, result) => {
    if (err) {
      console.error(err);
      res.render('pages/error', { message: 'An error occurred while fetching data from the database' });
    } else if (!result || result.length === 0) {
      res.render('pages/error', { message: 'No products found' });
    } else {
      res.render('pages/index', { result: result });
    }
  });
});

app.post('/add_to_cart', function (req, res) {
  const { id, name, price, sale_price, quantity, image } = req.body;
  const product = { id, name, price, sale_price, quantity, image };

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const cart = req.session.cart;

  if (!isProductInCart(cart, id)) {
    cart.push(product);
  } else {
    req.session.cart = [product];
  }

  // Calculate total
  calculateTotal(cart, req);

  // Return to cart page
  res.redirect('/cart');
});

app.post('/remove_product', function (req, res) {
  const { id } = req.body;
  const cart = req.session.cart;

  if (cart) {
    for (let i = cart.length - 1; i >= 0; i--) {
      if (cart[i].id === id) {
        cart.splice(i, 1);
        break;
      }
    }
  }

  // Calculate total
  calculateTotal(cart, req);

  // Return to cart page
  res.redirect('/cart');
});

app.get('/cart', function (req, res) {
  const cart = req.session.cart || [];
  const total = req.session.total || 0;

  res.render('pages/cart', { cart, total });
});

app.post('/edit_product_quantity', function (req, res) {
  const { id, quantity, increase_product_quantity, decrease_product_quantity } = req.body;
  const cart = req.session.cart;

  if (increase_product_quantity) {
    cart.forEach(item => {
      if (item.id === id && item.quantity > 0) {
        item.quantity = parseInt(item.quantity) + 1;
      }
    });
  }

  if (decrease_product_quantity) {
    cart.forEach(item => {
      if (item.id === id && item.quantity > 1) {
        item.quantity = parseInt(item.quantity) - 1;
      }
    });
  }

  calculateTotal(cart, req);
  res.redirect('/cart');
});

// Rest of your routes (checkout, place_order, payment, single_product, products, about)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
