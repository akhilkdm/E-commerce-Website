var express = require('express');
const async = require('hbs/lib/async');
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')

const credential = {
  email:process.env.ADMIN,
  password: process.env.PASSWORD
}

const verifyLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect('/admin/admin-login')
  }
}


/* GET users listing. */
router.get('/', verifyLogin,async function (req, res, next) {
  let totals=await productHelpers. TotalOders()
  let total=totals[0]?.count

  let totalSale=await productHelpers.Totalsales()
  let totalSales=totalSale[0]?.count

  let totalProfits=await productHelpers.Totalprofit()
  let totalProfit=totalProfits[0]

  let totalUser=await productHelpers.Totalusers()
  let totalUsers=totalUser[0]

  productHelpers.getAllProducts().then((products) => {
    res.render('admin/dashboard', { admin: true, products, user,total,totalSales,totalProfit,totalUsers})
  })

});

router.get('/getChartDetails', async (req, res) => {
  let dailyIncome = await productHelpers.getdailyIncome()
  let yearlyIncome = await productHelpers.getYearlySale()
  let month=await productHelpers.countsalemonth()
  res.json({ dailyIncome, yearlyIncome,month })
})


router.get('/view-products', verifyLogin, (req, res) => {
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/view-products', { admin: true, products })
  })

})

router.get('/admin-login', (req, res) => {
  if (req.session.adminLoggedIn) {
    admin = req.session.adminLoggedIn = true;
    res.redirect('/admin')
  } else {
    res.render('admin/admin-login', { admin: true })
  }
})

router.post('/admin-login', (req, res) => {
  if (req.body.Email == credential.email && req.body.Password == credential.password) {
    user = req.session.adminLoggedIn = true;
    req.session.admin = req.body.Email
    res.redirect('/admin')
  } else {
    res.render('admin/admin-login', { msg: "Login failed" })
  }
})

router.get('/add-product', verifyLogin, (req, res) => {
  productHelpers.getAllcategory().then((category) => {

    res.render('admin/add-product', { admin: true, category })
  })

})
router.post('/add-product', verifyLogin, (req, res) => {
  console.log(req.body);
  console.log(req.files.Image);


  productHelpers.addProduct(req.body, (result) => {
    let image = req.files.Image
    let image2 = req.files.Image2
    let image3 = req.files.Image3
    image.mv('./public/product-images/' + result + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-product', { admin: true })
      }
    })
    image2.mv('./public/product-images2/' + result + '.jpg', (err, done) => {
    })
    image3.mv('./public/product-images3/' + result + '.jpg', (err, done) => {
    })
  })
})

router.get('/delete-product/:id', verifyLogin, (req, res) => {
  let proId = req.params.id
  console.log(proId);

  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/view-products')
  })
})

router.get('/edit-product/:id', verifyLogin, async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id)
  productHelpers.getAllcategory().then((category) => {
    res.render('admin/edit-product', { product, admin: true, category })
  })
})

router.post('/edit-product/:id', verifyLogin, (req, res) => {
  let id = req.params.id
  // let image = req.files?.Image

  // let category=productHelpers.getAllcategory() 
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin/view-products')
  
    if (req.files?.Image && req.files?.Image2 && req.files?.Image3) {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')
      let image2 = req.files.Image2
      image2.mv('./public/product-images2/' + id + '.jpg')
      let image3 = req.files.Image3
      image3.mv('./public/product-images3/' + id + '.jpg')
    }

    else if (req.files?.Image && req.files?.Image2) {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')
      let image2 = req.files.Image2
      image2.mv('./public/product-images2/' + id + '.jpg')
    }

    else if (req.files?.Image && req.files?.Image3) {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')
      let image3 = req.files.Image3
      image3.mv('./public/product-images3/' + id + '.jpg')
    }
    else if (req.files?.Image3 && req.files?.Image2) {
      let image = req.files.Image3
      image.mv('./public/product-images3/' + id + '.jpg')
      let image2 = req.files.Image2
      image2.mv('./public/product-images2/' + id + '.jpg')
    }
    else if (req.files?.Image3) {
      let image = req.files.Image3
      image.mv('./public/product-images3/' + id + '.jpg')

    }
    else if (req.files?.Image2) {
      let image = req.files.Image2
      image.mv('./public/product-images2/' + id + '.jpg')

    }
    else if (req.files?.Image) {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')

    }
  })
})

router.get('/view-user', verifyLogin, (req, res) => {
  productHelpers.getAllusers().then((users) => {
    res.render('admin/view-user', { admin: true, users, user })
  })
});

router.get('/block-user/:id', verifyLogin, (req, res) => {
  let userId = req.params.id

  productHelpers.blockUser(userId).then((response) => {

    if (response) {
      req.session.user = null;
      req.session.userLoggedIn = false;
    }

    res.redirect('/admin/view-user')
  })
});

router.get('/unblock-user/:id', verifyLogin, (req, res) => {
  let userId = req.params.id

  productHelpers.unblockUser(userId).then((response) => {
    res.redirect('/admin/view-user')
  })
})
router.get('/view-category', verifyLogin, (req, res) => {
  productHelpers.getAllcategory().then((category) => {
    
    res.render('admin/view-category', { category, admin: true })
  })
})
router.get('/add-category', verifyLogin, (req, res) => {
  res.render('admin/add-category', { admin: true })
})
router.post('/add-category', verifyLogin, (req, res) => {

  productHelpers.addcategory(req.body).then((result) => {
    let image = req.files.Image

    image.mv('./public/category-images/' + result + '.jpg', (err, done) => {
      if (!err) {
        res.redirect('/admin/view-category')

      } else {
       
      }
    })
  })
})
router.get('/delete-category/:id', verifyLogin, (req, res) => {
  let userId = req.params.id
  productHelpers.deletecategory(userId).then((response) => {
    res.redirect('/admin/view-category')
  })
});

router.get('/logout', (req, res) => {
  req.session.admin = null
  req.session.adminLoggedIn = false
  res.redirect('/admin/admin-login')
})

router.get('/orders', verifyLogin, (req, res) => {
  productHelpers.getAllorders().then((orders) => {
    res.render('admin/orders', { admin: true, orders })

  })
})

router.get('/product-details/:id', verifyLogin, async (req, res) => {
  productHelpers.getOrderProducts(req.params.id).then((products) => {

    res.render('admin/product-details', { admin: true, products })
  })

})

router.get('/cancel-order/:id', verifyLogin, (req, res) => {
  let orderId = req.params.id
  productHelpers.cancelOrder(orderId).then((response) => {
    if (response) {
      res.redirect('/admin/orders')
    }
  })
});

router.get('/ship-order/:id', verifyLogin, (req, res) => {
  let orderId = req.params.id
  productHelpers.shipOrder(orderId).then((response) => {
    if (response) {
      res.redirect('/admin/orders')
    }
  })
});

router.get('/deliver-order/:id', verifyLogin, (req, res) => {
  let orderId = req.params.id
  productHelpers.deliverOrder(orderId).then((response) => {
    if (response) {
      res.redirect('/admin/orders')
    }
  })
});

router.get('/reports', verifyLogin, async (req, res) => {
  let weeklyIncome = await productHelpers.getWeekIncome()

  res.render('admin/reports', { weeklyIncome, admin: true })
})


// ----------------------------------------------------------Category Offer-----------------------------------------------------------

router.get('/category-offer', verifyLogin, async (req, res) => {
 
  category = await productHelpers.getAllcategory()
  let catOffers = await productHelpers.getAllCatOffers();
  res.render('admin/category-offer', { category, catOffers, admin: true })
})

router.post('/category-offer', verifyLogin, (req, res) => {
 
  productHelpers.addCategoryOffer(req.body).then(() => {
    res.redirect("/admin/category-offer")
  })
})

router.get('/delete-catOffer/:id', verifyLogin, (req, res) => {
  productHelpers.deleteCatOffer(req.params.id).then(() => {
    res.redirect("/admin/category-offer")
  })
})


//-----------------------------------------------------coupron Offer------------------------------------------

router.get('/coupon-offer', verifyLogin,async (req, res) => {
  coupon= await productHelpers.getAllCoupon()

  res.render("admin/coupon-offer", { admin: true ,coupon})
})

router.post('/coupon-offer', verifyLogin, (req, res) => {

  productHelpers.addCoupon(req.body).then(() => {
    res.redirect("/admin/coupon-offer")
  })
})

router.get("/delete-coupon/:id",verifyLogin, (req, res) => {

  productHelpers.deleteCoupon(req.params.id).then(() => {
    res.redirect("/admin/coupon-offer");
  });
});


router.get("/report",verifyLogin,(req,res)=>{
productHelpers.monthlyReport().then((data)=>{
  res.render("admin/report",{admin:true,data})
}) 
})


router.post("/report",verifyLogin,(req,res)=>{
  productHelpers.salesReport(req.body).then((data)=>{
    res.render("admin/report",{admin:true,data})
  })
})

module.exports = router;