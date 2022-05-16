var db = require('../config/connection')
var collection = require('../config/collections')
const { reject } = require('bcrypt/promises')
const res = require('express/lib/response')
const async = require('hbs/lib/async')
const moment = require('moment')
var objectId = require('mongodb').ObjectId
const promise = require('promise')
module.exports = {
    addProduct: (product, callback) => {

        db.get().collection('product').insertOne(product).then(async (data) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            console.log(products);


            for (i = 0; i < products.length; i++) {
                let OP = parseInt(products[i].originalPrice)
                let OfP = parseInt(products[i].offerPercentage)
                var offerPrice
                if (OfP) {
                    offerPrice = OP - (OP * (OfP / 100)).toFixed(0)

                } else {
                    offerPrice = OP
                }

                var ids = products[i]._id


            }
            //  console.log(offerprice);




            db.get().collection(collection.PRODUCT_COLLECTION).findOneAndUpdate({ _id: objectId(ids) }, { $set: { "Price": offerPrice } })
            callback(data.insertedId)
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).remove({ _id: objectId(prodId) }).then((response) => {
                resolve(response)
            })
        })
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },
    updateProduct: (proId, proDetails, category) => {
        console.log("prodetails", proDetails);
        let OP = parseInt(proDetails.originalPrice)
        let OfP = parseInt(proDetails.offerPercentage)
        console.log("op", OP);
        console.log("ofp", OfP);
        var offerPrice
        if (OfP) {
            offerPrice = OP - (OP * (OfP / 100)).toFixed(0)

        } else {
            offerPrice = OP
        }
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
                $set: {
                    Name: proDetails.Name,
                    Category: proDetails.Category,
                    Price: offerPrice,
                    originalPrice: proDetails.originalPrice,
                    offerPercentage: proDetails.offerPercentage,
                    Description: proDetails.Description

                }
            }).then((response) => {
                resolve()
            })
        })
    },
    getAllusers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },

    getuserDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) }).then((user) => {
                resolve(user)
            })
        })
    },
    blockUser: (userId) => {
        return new Promise((resolve, reject) => {
            console.log(userId);
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    blocked: true
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },

    unblockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    blocked: false
                }
            }).then((response) => {
                resolve()
            })
        })
    },
    getAllcategory: () => {
        return new Promise(async (resolve, reject) => {
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            resolve(category)
        })
    },
    addcategory: (category) => {
        return new Promise((resolve, reject) => {
            db.get().collection('category').insertOne(category).then((data) => {
                resolve(data.insertedId)

            })
        })

    }, deletecategory: (catId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ _id: objectId(catId) }).then((response) => {
                resolve(response)
            })
        })

    },
    getAllorders: () => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find().sort({ date: -1 }).toArray()
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            console.log("hi", orderItems);
            resolve(orderItems)
        })

    },
    cancelOrder: (orderId) => {
        return new Promise((resolve, reject) => {

            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: "cancelled",
                    Cancelled: true,
                    Delivered: false
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },
    shipOrder: (orderId) => {
        return new Promise((resolve, reject) => {

            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: "Shipped",
                    Delivered: false
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },
    deliverOrder: (orderId) => {
        return new Promise((resolve, reject) => {

            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: "Delivered",
                    Delivered: true
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },
    getdailyIncome: () => {
        return new Promise(async (resolve, reject) => {
            let dailySale = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "Delivered"
                    }
                },

                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$DateISO" } },
                        totalAmount: { $sum: "$totalAmount" },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: -1 }
                },
                {
                    $limit: 7
                }
            ]).toArray()
            console.log("daily", dailySale);
            resolve(dailySale)
        })
    },
    getCurrentDaySale: () => {
        return new Promise(async (resolve, reject) => {
            let currentDate = new Date
            currentDate = currentDate.toISOString().split('T')[0]
            let todaySale = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "Delivered"
                    }
                },
                {
                    $project: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$DateISO" } }, totalAmount: 1
                    }
                },
                {
                    $match: { DateISO: currentDate }
                },
                {
                    $group: {
                        _id: "$DateISO",
                        total: { $sum: "$totalAmount" },

                    }
                }


            ]).toArray()
            let data = 0
            todaySale.map(val => data = val.total)
            resolve(data)
        })
    },
    getYearlySale: () => {

        let curDate = new Date
        let currentYear = curDate.getFullYear();
        currentYear = currentYear + ""

        return new Promise(async (resolve, reject) => {

            let yearlySale = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "Delivered"
                    }
                },
                {
                    $project: {
                        DateISO: { $dateToString: { format: "%Y", date: "$DateISO" } }, totalAmount: 1
                    }
                },

                {
                    $group: {
                        _id: "$DateISO",
                        total: { $sum: "$totalAmount" },

                    }
                }


            ]).toArray()
            console.log("Yearly", yearlySale);
            resolve(yearlySale)
        })
    },
    countsalemonth: () => {
        return new promise(async (resolve, reject) => {
            let dailySale = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        "status": "Delivered"
                    }
                },

                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m", date: '$DateISO' } },
                        totalAmount: { $sum: "$totalAmount" },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: -1 }
                },

            ]).toArray()
            console.log(dailySale);
            resolve(dailySale)
        })

    },
    getAllCatOffers: () => {
        return new Promise((res, rej) => {
            let categoryOffer = db.get().collection(collection.CATEGORY_OFFER_COLLECTION).find().toArray()
            res(categoryOffer)
        })
    },
    addCategoryOffer: (data) => {
        return new Promise((res, rej) => {
            data.startDateIso = new Date(data.Starting)
            data.endDateIso = new Date(data.Expiry)
            db.get().collection(collection.CATEGORY_OFFER_COLLECTION).insertOne(data).then(async (response) => {
                res(response)
            }).catch((err) => {
                rej(err)
            })

        })
    },
    startCategoryOffer: (date) => {
        let catStartDateIso = new Date(date);
        return new Promise(async (res, rej) => {
            let data = await db.get().collection(collection.CATEGORY_OFFER_COLLECTION).find({ startDateIso: { $lte: catStartDateIso } }).toArray();
            console.log("data", data);
            if (data.length > 0) {
                await data.map(async (onedata) => {
                    console.log("onedata", onedata.Category);
                    let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ Category: onedata.Category, offer: { $exists: false } }).toArray();
                    console.log("products", products);
                    await products.map(async (product) => {
                        let ogPrice = product.originalPrice
                        let actualPrice = product.Price
                        let newPrice = (((product.originalPrice) * (onedata.catOfferPercentage)) / 100)
                        newPrice = newPrice.toFixed()
                        console.log(actualPrice, newPrice, onedata.catOfferPercentage);
                        db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(product._id) },
                            {
                                $set: {
                                    originalPrice: ogPrice,
                                    productOfferPrice: actualPrice,
                                    Price: (actualPrice - newPrice),
                                    offer: true,
                                    catOfferPercentage: onedata.catOfferPercentage
                                }
                            })
                    })
                })
                res();
            } else {
                res()
            }

        })

    },
    deleteCatOffer: (id) => {
        return new Promise(async (res, rej) => {
            let categoryOffer = await db.get().collection(collection.CATEGORY_OFFER_COLLECTION).findOne({ _id: objectId(id) })
            let catName = categoryOffer.Category
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).find({ Category: catName }, { offer: { $exists: true } }).toArray()
            if (product) {
                db.get().collection(collection.CATEGORY_OFFER_COLLECTION).deleteOne({ _id: objectId(id) }).then(async () => {
                    await product.map((product) => {

                        db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(product._id) }, {
                            $set: {
                                Price: product.productOfferPrice
                            },
                            $unset: {
                                offer: "",
                                catOfferPercentage: '',
                                productOfferPrice: ''
                            }
                        }).then(() => {
                            res()
                        })
                    })
                })
            } else {
                res()
            }

        })

    },
    addCoupon: (data) => {
        return new Promise(async (res, rej) => {
            let startDateIso = new Date(data.Starting)
            let endDateIso = new Date(data.Expiry)
            let expiry = await moment(data.Expiry).format('YYYY-MM-DD')
            let starting = await moment(data.Starting).format('YYYY-MM-DD')
            let dataobj = await {
                Coupon: data.Coupon,
                Offer: parseInt(data.Offer),
                Starting: starting,
                Expiry: expiry,
                startDateIso: startDateIso,
                endDateIso: endDateIso,
                Users: []
            }
            db.get().collection(collection.COUPON_COLLECTION).insertOne(dataobj).then(() => {
                res()
            }).catch((err) => {
                res(err)
            })

        })
    },
    getAllCoupon: () => {
        return new Promise((res, rej) => {
            let coupon = db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            res(coupon)
        })
    },
    TotalOders: () => {
        return new promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                { $group: { _id: null, count: { $sum: 1 } } },
                { $project: { _id: 0 } }
            ]).toArray()
            console.log(total);
            resolve(total)

        })
    },
    Totalsales: () => {
        return new promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "Delivered"
                    }
                },
                { $group: { _id: null, count: { $sum: 1 } } },
                { $project: { _id: 0 } }
            ]).toArray()
            console.log(total);
            resolve(total)

        })

    },
    Totalprofit: () => {
        return new promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "Delivered"
                    }
                },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } },
                { $project: { _id: 0 } }
            ]).toArray()
            console.log(total);
            resolve(total)

        })


    },
    Totalusers: () => {
        return new promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.USER_COLLECTION).aggregate([
                { $group: { _id: null, count: { $sum: 1 } } },
                { $project: { _id: 0 } }
            ]).toArray()
            console.log(total);
            resolve(total)

        })

    },

    deleteCoupon: (id) => {
        return new Promise((res, rej) => {
            db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: objectId(id) }).then(() => {
                res()
            })
        })
    },
    monthlyReport: () => {
        return new Promise(async (res, rej) => {
            let today = new Date()
            let end = moment(today).format('YYYY/MM/DD')
            let start = moment(end).subtract(30, 'days').format('YYYY/MM/DD')
            let orderSuccess = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' } }).toArray()

            let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end } }).toArray()
            let orderSuccessLength = orderSuccess.length
            let orderTotalLength = orderTotal.length
            let orderFailLength = orderTotalLength - orderSuccessLength
            let total = 0;
            let paypal = 0;
            let razorpay = 0;
            let cod = 0;
            for (let i = 0; i < orderSuccessLength; i++) {
                total = total + orderSuccess[i].totalAmount;
                if (orderSuccess[i].paymentMethod == 'PAYPAL') {
                    paypal++;
                } else if (orderSuccess[i].paymentMethod == 'ONLINE') {
                    razorpay++;
                } else if (orderSuccess[i].paymentMethod == 'COD') {
                    cod++;
                }
            }
            var data = {
                start: start,
                end: end,
                totalOrders: orderTotalLength,
                successOrders: orderSuccessLength,
                failedOrders: orderFailLength,
                totalSales: total,
                cod: cod,
                paypal: paypal,
                razorpay: razorpay,
                currentOrders: orderSuccess
            }
            // console.log(data);
            res(data)
        })
    },

    salesReport: (date) => {
        return new Promise(async (res, rej) => {

            let end = moment(date.EndDate).format('YYYY/MM/DD')
            let start = moment(date.StartDate).format('YYYY/MM/DD')

            let orderSuccess = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end }, status: { $ne: 'Cancelled' } }).toArray()
            let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end } }).toArray()
            let orderSuccessLength = orderSuccess.length
            let orderTotalLength = orderTotal.length
            let orderFailLength = orderTotalLength - orderSuccessLength
            let total = 0;
            let paypal = 0;
            let razorpay = 0;
            let cod = 0;
            for (let i = 0; i < orderSuccessLength; i++) {
                total = total + orderSuccess[i].totalAmount;
                if (orderSuccess[i].paymentMethod == 'PAYPAL') {
                    paypal++;
                } else if (orderSuccess[i].paymentMethod == 'ONLINE') {
                    razorpay++;
                } else {
                    cod++;

                }
            }
            var data = {
                start: start,
                end: end,
                totalOrders: orderTotalLength,
                successOrders: orderSuccessLength,
                failedOrders: orderFailLength,
                totalSales: total,
                cod: cod,
                paypal: paypal,
                razorpay: razorpay,
                currentOrders: orderSuccess
            }
            res(data)
        })

    }
}