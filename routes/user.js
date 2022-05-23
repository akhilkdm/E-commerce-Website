const { response } = require('express');
var express = require('express');
const res = require('express/lib/response');
const async = require('hbs/lib/async');
const { Db, ObjectId } = require('mongodb');

var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const { checkBlock } = require('../helpers/user-helpers');
const userHelpers = require('../helpers/user-helpers')


SERVICESID="VAda4c0ea9105541bd654606ea6d516253"
ACCOUNTSID="ACde55967218170995940ca0fb33469a4a"
AUTHTOKEN="364UE6oSRuRDXJdpoDj4D2nJR8fJP74M42"




const client = require('twilio')(ACCOUNTSID, AUTHTOKEN)
const paypal = require('paypal-rest-sdk')
const createReferal = require('referral-code-generator')

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': process.env.CLIENTID,
  'client_secret': process.env.CLIENTSECRET
});


const verifyLogin = (req, res, next) => {
  if (req.session.user) {
    next()
  } else {
    res.redirect('/login')
  }
}

const verifyBlock = (req, res, next) => {
  if (req.session.user) {
    userHelpers.checkBlock(req.session.user).then((isBlock) => {
      if (!isBlock) {
        next()
      } else {
        req.session.user = null
        res.redirect('/')
      }
    })
  } else {
    next()
  }
}

/* GET home page. */
router.get('/', verifyBlock, async function (req, res, next) {

  let user = req.session.user
  // let cartCount=null;
  let todayDate = new Date().toISOString().slice(0, 10);
  let cartCount = await userHelpers.getCartCount(req.session?.user?._id)
  let catOff = await productHelpers.startCategoryOffer(todayDate);
  productHelpers.getAllProducts().then((products) => {
    productHelpers.getAllcategory().then((category) => {
      res.render('user/view-products', { products, user, catOff, category, cartCount })
    })
  })
});

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else {

    res.render('user/login', { "loginErr": req.session.userLoginErr })
    req.session.userLoginErr = false
  }

})

router.get('/signup', async (req, res) => {
  let refer = (await req.query.refer) ? req.query.refer : null;
  res.render('user/signup', { refer })
})

router.post('/signup', (req, res) => {
 

  let refer = createReferal.alphaNumeric("uppercase", 2, 3);
  req.body.refer = refer;
  if (req.body.referedBy != "") {
    userHelpers
      .checkReferal(req.body.referedBy)
      .then((data) => {
        req.body.referedBy = data[0]._id;
        req.body.wallet = 100;
        userHelpers.emailCheck(req.body.Email, req.body.number).then((resp) => {
          if (resp) {
            if (resp.number == req.body.number) {
              let check = true;
              res.render('user/signup', { check: 'Mobile Already exist' })
            } else {
              let check = true;
              res.render('user/signup', { check: 'Email Already exist' })
            }
          } else {
            userSignup = req.body;

            client.verify
              .services(SERVICESID)
              .verifications.create({
                to: `+91${req.body.number}`,
                channel: "sms",
              }).then((response) => {
                let signupPhone = req.body.number;
                res.render("user/signupOtp", { signupPhone });
              })
          }

        })
      })
      .catch(() => {
        req.session.referErr = "Sorry No such Code Exists";
        res.redirect("/signup");
      });
  } else {
    userHelpers.emailCheck(req.body.Email, req.body.number).then((resp) => {
      if (resp) {
        if (resp.number == req.body.number) {
          let check = true;
          res.render('user/signup', { check: 'Mobile Already exist' })
        } else {
          let check = true;
          res.render('user/signup', { check: 'Email Already exist' })
        }
      } else {
        userSignup = req.body;
        console.log("number",req.body.number);
        client.verify
          .services(SERVICESID)
          .verifications.create({
            to: `+91${req.body.number}`,
            channel: "sms",
          }).then((response) => {
            console.log("response",response);
            let signupPhone = req.body.number;
            res.render("user/signupOtp", { signupPhone });
          })
      }

    })
  }
})

var signupSuccess
router.get('/signupOtp', (req, res) => {
  res.header(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  let phoneNumber = req.query.phonenumber;
  let otpNumber = req.query.otpnumber;
  client.verify
    .services(SERVICESID)
    .verificationChecks.create({
      to: "+91" + phoneNumber,
      code: otpNumber,
    }).then((resp) => {
      if (resp.valid) {
        userHelpers.doSignup(userSignup).then((response) => {
         
          if (response.acknowledged) {
            let valid = true;
            signupSuccess = "You are successfully signed up"
            res.send(valid)
          } else {
            let valid = false;
            res.send(valid);
          }
        })
      }
    })

})


router.post('/login', (req, res) => {
 
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      if (!response.blocked) {
        req.session.user = response.user
        req.session.user.loggedIn = true
        res.redirect('/')

      } else {
        req.session.userLoginErr = "sorry your account is blocked"
        res.redirect('/login')

      }

    } else {
      req.session.userLoginErr = "invalid user name or password"
      res.redirect('/login')
    }
  })
})

router.get('/logout', ((req, res) => {
  req.session.user = null
  res.redirect('/')
}))




router.get('/otp-login', (req, res) => {
  res.render('user/otp-login')
})

router.post('/otp-login', (req, res) => {

 
  var phone = req.body.number;
  userHelpers.checkPhone(phone).then((number) => {

    if (number?.blocked) {
  
      res.render('user/otp-login', { otperror: "Your Account is blocked" })
    } else {
      if (number) {
        console.log("no",number);
        console.log("ssid",SERVICESID);
        client.verify.services(SERVICESID)
          .verifications.create({
            to: `+91${req.body.number}`,

            channel: "sms",
          }).then((resp) => {
            otpPhone = phone


            res.render('user/otp', { otpPhone })

          })
      }
      else {
        res.render('user/otp-login', { otperror: "Invalid Number" })
      }
    }


  })
})


router.post('/otp/:id', (req, res) => {

  let otp = req.body.otp
  let phonenumber = req.params.id


  client.verify.services(SERVICESID).verificationChecks.create({
    to: `+91${phonenumber}`,
    code: otp
  }).then((resp) => {
 
    if (resp.valid) {
      userHelpers.doLoginOtp(phonenumber).then((response) => {
        if (response.status) {
          if (!response.blocked) {
            req.session.user = response.user
            req.session.user.loggedIn = true
            res.redirect('/')

          } else {
            req.session.userLoginErr = "sorry your account is blocked"
            res.redirect('/login')

          }

        } else {

          req.session.userLoginErr = "invalid user name or password"
          res.redirect('/login')
        }
      })
    } else {
  
      req.session.userLoginErr = "invalid OTP"
      res.render('user/otp', { otperror: "Invalid otp", otpPhone })
    }
  })
})

router.get('/resendOtp/:id', (req, res) => {
  otpPhone = req.params.id
  client.verify.services(SERVICESID)
    .verifications.create({
      to: `+91${req.body.number}`,

      channel: "sms",
    }).then((resp) => {
      if (resp) {

        res.render('user/otp', { otpPhone, reotp: "OTP has been send" })

      }

    })
})

router.get('/product-details/:id', verifyLogin, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id)
  let relCat=product.Category;
  let relProducts=await userHelpers.relatedProducts(relCat);
  let cartCount = await userHelpers.getCartCount(req.session?.user?._id)
  
  res.render('user/product-details', { product, user: req.session.user,cartCount,relProducts })
})


router.get('/cart', verifyLogin, async (req, res, next) => {
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let cartCount = await userHelpers.getCartCount(req.session?.user?._id)
  let totalValue = 0;
  if (products.length > 0) {
    totalValue = await userHelpers.getTotalAmount(req.session.user._id)
  }
  res.render('user/cart', { products, user: req.session.user, totalValue, cartCount })
})



router.get('/add-to-cart/:id', (req, res) => {

  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
})

router.post('/change-product-quantity', (req, res, next) => {

  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.post('/remove-cart-product', (req, res, next) => {

  userHelpers.removeCartProduct(req.body).then((response) => {
    res.json(response)
  })
})

router.get('/addNewAddress', verifyLogin, async (req, res) => {

  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let userDetails = await userHelpers.getProfile(req.session.user._id)

  res.render('user/place-order', { total, user: req.session.user, userDetails })
})

router.post('/addNewAddress', async (req, res) => {
  
  let products = await userHelpers.getCartProductList(req.body.userId)
  if (req.session.couponTotal) {
  
    var totalPrice = req.session.couponTotal
  }
  else {
    totalPrice = await userHelpers.getTotalAmount(req.body.userId)

  }

  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if (req.body['payment-method'] === 'COD') {
      res.json({ codSuccess: true })
    } else if (req.body['payment-method'] === 'ONLINE') {
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        res.json(response)
      })
    } else if (req.body['payment-method'] === "PAYPAL") {
     
      val = totalPrice / 74;
      totalPrice = val.toFixed(2);
      let totals = totalPrice.toString();
      req.session.total = totals;
      var create_payment_json = {
        "intent": "sale",
        "payer": {
          "payment_method": "paypal"
        },
        "redirect_urls": {
          "return_url": "http://localhost:3000/order-success",
          "cancel_url": "http://localhost:3000/cancel"
        },
        "transactions": [{
          "item_list": {
            "items": [{
              "name": "item",
              "sku": "001",
              "price": totals,
              "currency": "USD",
              "quantity": 1
            }]
          },
          "amount": {
            "currency": "USD",
            "total": totals
          },
          "description": "This is the payment description."
        }]
      };
      paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
          throw error;
        }
        else {
        
          for (var i = 0; i < payment.links.length; i++) {
           
            if (payment.links[i].rel === "approval_url") {
            
              let link = payment.links[i].href;
              link = link.toString()
              
              res.json({ paypal: true, url: link })
             
            }
          }
        }
      })
    }
    router.get('/success', (req, res) => {
      if (req.session.user.loggedIn) {
        let paypalAmt = req.session.total
        paypalAmt = paypalAmt.toString()
       
        const payerId = req.query.PayerID
        const paymentId = req.query.paymentId
        var execute_payment_json = {
          "payer_id": payerId,
          "transactions": [{
            "amount": {
              "currency": "USD",
              "total": paypalAmt
            }
          }]
        }
        paypal.payment.execute(paymentId, execute_payment_json, function (error,
          payment) {
          if (error) {
           
            throw error;
          } else {
       
            userHelpers.changePaymentStatus(req.session.orderId).then(() => {
              res.render('user/order-success')
            })
          }
        });
      }
      else {
        res.render('user/login')
      }
    })

  })

})


router.get('/address-selection', verifyLogin, async (req, res) => {
  let address = await userHelpers.getAddressDetails(req.session.user?._id)
  let total = await userHelpers.getTotalAmount(req.session.user?._id)
  let user = req.session.user
  let userDetails = await userHelpers.getProfile(req.session.user._id)

  res.render('user/address-selection', { total, user, address, userDetails })
})

router.post('/address-selection', verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProductList(req.session.user?._id)

  if (req.session.couponTotal || req.session.walletTotal) {

    if (req.session.couponTotal) {
      var totalPrice = req.session.couponTotal;
    } else {
      var totalPrice = req.session.walletTotal;
    }
  }
  else {
    totalPrice = await userHelpers.getTotalAmount(req.session.user._id)
  }
  let user = await userHelpers.getProfile(req.session.user._id)
  let address = await userHelpers.getUserAddressDetails(req.query.addressId, req.session.user._id)
  userHelpers.placeOrderr(address, products, totalPrice, req.query.payment, user).then((orderId) => {
    if (req.query.payment === 'COD') {
      userHelpers.clearCart(req.session.user._id).then(()=>{
        res.json({ codSuccess: true })
      })
      
    }else if (req.query.payment === "PAYPAL") {
    
      val = totalPrice / 74;
      totalPrice = val.toFixed(2);
      let totals = totalPrice.toString();
      req.session.total = totals;
      var create_payment_json = {
        "intent": "sale",
        "payer": {
          "payment_method": "paypal"
        },
        "redirect_urls": {
          "return_url": "http://localhost:3000/order-success",
          "cancel_url": "http://localhost:3000/cancel"
        },
        "transactions": [{
          "item_list": {
            "items": [{
              "name": "item",
              "sku": "001",
              "price": totals,
              "currency": "USD",
              "quantity": 1
            }]
          },
          "amount": {
            "currency": "USD",
            "total": totals
          },
          "description": "This is the payment description."
        }]
      };
      paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
          throw error;
        }
        else {
         
          for (var i = 0; i < payment.links.length; i++) {
        
            if (payment.links[i].rel === "approval_url") {
            
              let link = payment.links[i].href;
              link = link.toString()
              res.json({ paypal: true, url: link })
              
         
            }
          }
        }
      })
    }
    else {
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
       
        res.json(response)
      })
    }
  })
})


router.get('/order-success', verifyLogin, (req, res) => {
  userHelpers.clearCart(req.session.user._id).then(()=>{
    userHelpers.changePaymentStatus(req.session.orderId).then(()=>{
  
  res.render('user/order-success', { user: req.session.user })
    })
  })
})

router.get('/cancel', verifyLogin, (req, res) => {
  res.render('user/cancel', { user: req.session.user })
})

router.get('/orders', verifyLogin, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user?._id)
  res.render('user/orders', { user: req.session.user, orders })
})

router.get('/view-order-products/:id', verifyLogin, async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.params.id)

  res.render('user/view-order-products', { user: req.session.user, products })
})

router.get('/profile', verifyLogin, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id)

  let address = orders[0]?.deliveryDetails
  let profile = await userHelpers.getProfile(req.session.user?._id)
  let refer = req.session.user.refer;
  let referalLink = "localhost:3000/signup?refer=" + refer;
  res.render('user/profile', { profile, user: req.session.user, address, referalLink })
})

router.get('/edit-profile', verifyLogin, async (req, res) => {
  let profile = await userHelpers.getProfile(req.session.user._id)

  res.render('user/edit-profile', { profile, user: req.session.user })
})

router.post('/edit-profile', verifyLogin, async (req, res) => {
  let userId = req.body.userId
  req.session.user.Name = req.body.Name
  userHelpers.updateProfile(userId, req.body).then(() => {
    res.redirect('/profile')
  })
})

router.post('/edit-profilepic',(req,res)=>{
  let user=req.session.user._id

  if(req.files.image){
    let image=req.files.image
    image.mv('./public/profile-images/'+user+'.jpg',(err,done)=>{
      req.session.user.profile=true
    userHelpers.updateprofileImage(user).then((response)=>{
      res.redirect('/profile')
    })

    })
  }
})

router.post('/change-password', verifyLogin, (req, res) => {
  userHelpers.changePassword(req.body).then(async (response) => {
    if (response.status) {
      let profile = await userHelpers.getProfile(req.session.user._id)
      let succMsg = response.succPass;
      res.render('user/profile', { succMsg, user: req.session.user, profile })
    } else {

      let errorMsg = response.errorPass;
      res.render('user/edit-profile', { errorMsg, user: req.session.user })
    }

  })
})

router.get('/cancel-order/:id', verifyLogin, (req, res) => {
  let orderId = req.params.id
  userHelpers.cancelOrder(orderId).then((response) => {
    res.redirect('/orders')
  })
})

router.get('/return-order/:id', verifyLogin, (req, res) => {
  let orderId = req.params.id
  userHelpers.returnOrder(orderId).then((response) => {
    res.redirect('/orders')
  })
})

router.get('/address-page', verifyLogin, async (req, res) => {
  let address = await userHelpers.getAddressDetails(req.session.user._id)
  res.render('user/address-page', { address, user: req.session.user })
})

router.get('/edit-address/:id', verifyLogin, async (req, res) => {
  let user1 = req.session.user?._id;
  let address = await userHelpers.getUserAddressDetails(req.params.id, user1)

  res.render('user/edit-address', { address, user: req.session.user })
})

router.post('/edit-address/:id', verifyLogin, (req, res) => {
  userHelpers.updateAddress(req.params.id, req.body).then(() => {
    res.redirect('/address-page')
  })
})

router.get('/delete-address/:id', verifyLogin, (req, res) => {
  userHelpers.deleteAddres(req.params.id).then(() => {
    res.redirect('/address-page')
  })
})

router.get('/add-address', verifyLogin, (req, res) => {
  res.render('user/add-address', { user: req.session.user })
})

router.post('/add-address', verifyLogin, (req, res) => {
  let userId = ObjectId(req.session.user._id)

  req.body.userId = userId


  userHelpers.addAddress(req.body, userId).then(() => {
    res.redirect('/address-page')
  })
})

router.post('/verify-payment', (req, res) => {

  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {

      res.json({ status: true })
    })

  }).catch((err) => {
 
    res.json({ status: false, errMsg: '' })
  })
})

router.get('/view-category/:id', verifyLogin,async (req, res) => {
  let category = req.params.id
  let cartCount = await userHelpers.getCartCount(req.session?.user?._id)

  userHelpers.categoryView(category).then((products) => {
 
    res.render('user/view-category', { products, user: req.session.user,cartCount })
  })

})

//---------------------------------------------------Coupons----------------------------------------

router.post("/couponApply", verifyLogin, (req, res) => {
  let id = req.session.user._id;
  userHelpers.couponValidate(req.body, id).then((response) => {
   
    req.session.couponTotal = response.total;
  
    if (response.success) {
      res.json({ couponSuccess: true, total: response.total });
    } else if (response.couponUsed) {
      res.json({ couponUsed: true });
    } else if (response.couponExpired) {
      res.json({ couponExpired: true });
    } else {
      res.json({ invalidCoupon: true });
    }
  });
});


//applay the wallet into place-order page
router.post('/applyWallet', async (req, res) => {
  
  var user = req.session.user._id;
  let ttl = parseInt(req.body.Total);

  let walletAmount = parseInt(req.body.wallet);
  let userDetails = await productHelpers.getuserDetails(user);


  if (userDetails.wallet >= walletAmount) {
    let total = ttl - walletAmount;
    userHelpers.applyWallet(walletAmount, user).then(() => {
      req.session.walletTotal = total;
      res.json({ walletSuccess: true, total });
    });
  } else {
    res.json({ valnotCurrect: true });
  }
});


module.exports = router;