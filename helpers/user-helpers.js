var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const async = require('hbs/lib/async')
const promise = require('promise')
const res = require('express/lib/response')
const moment = require('moment')
const { CART_COLLECTION } = require('../config/collections')
const { resolve, reject } = require('promise')
// const { Promise } = require('mongodb')
var objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay')
var instance = new Razorpay({
    key_id: 'rzp_test_iFauwdezgenPwJ',
    key_secret: 'OQd4jUfe8uRSdSCSAGkQl5Cs',
});

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data)
            })
            if (userData.referedBy != '') {
                console.log("refer", userData.referedBy);
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userData.referedBy) }, { $inc: { wallet: 100 } })
            }
        })

    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;

            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })

            if (user) {

                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        response.blocked = user.blocked
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        resolve({ status: false })
                    }
                })
            } else {

                resolve({ status: false })
            }
        })
    },
    checkPhone: (phone) => {
        console.log("poetry",phone);
        return new promise(async (resolve, reject) => {
            let number = await db.get().collection(collection.USER_COLLECTION).findOne({ number: phone })
            console.log("akhi",number.number);
            resolve(number)


        })
    },
    emailCheck: (email, mob) => {
        return new promise(async (res, rej) => {
            let found = await db.get().collection(collection.USER_COLLECTION).findOne({ $or: [{ Email: email }, { number: mob }] })
            console.log("found",found);
            res(found)
        })
    },
    checkReferal: (referal) => {
        return new Promise(async (res, rej) => {
            let refer = await db.get().collection(collection.USER_COLLECTION).find({ refer: referal }).toArray();
            if (refer) {
                res(refer)
            } else {
                res(err)
            }
        });
    },


    doLoginOtp: (phone) => {
        return new promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ number: phone })
            if (user) {

                response.blocked = user.userBlocked
                response.user = user
                response.status = true
                resolve(response)

            } else {
                resolve({ status: false })
            }

        })

    },
    checkBlock: (user) => {
        return new promise(async (resolve, reject) => {
            let result = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(user._id) })
            resolve(result.userBlocked)
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)

                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {
                            $push: { products: proObj }
                        }
                    ).then((response) => {
                        resolve()
                    })
                }
            } else {

                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve();
                    console.log("3");
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
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
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        let count = 0
        return new promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart) },
                        {
                            $pull: { products: { item: objectId(details.product) } }

                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }
                    ).then((response) => {
                        resolve({ status: true })
                    })
            }
        })
    },
    removeCartProduct: (details) => {
        return new promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION)
                .updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }

                    }
                ).then((response) => {
                    resolve(response)
                })
        })
    },
    getTotalAmount: (userId) => {
        return new promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
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
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ["$quantity", { $toInt: "$product.Price" }] } }
                    }
                }

            ]).toArray()
            resolve(total[0]?.total)
        })

    },
    placeOrder: (order, products, total) => {
        let coupon = order.Coupon
        return new promise((resolve, reject) => {
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let dateIso=new Date()
            let date = moment(dateIso).format('YYYY/MM/DD')
            let time= moment(dateIso).format('HH:mm:ss')
            let orderObj = {

                deliveryDetails: {
                    name: order.name,
                    address: order.address,
                    pincode: order.pincode,
                    mobile: order.mobile,
                    userId: objectId(order.userId)
                },
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                DateISO:dateIso,
                status: status,
                date: date,
                Time:time
            }

            let user = order.userId
            console.log("uss", user);
            db.get().collection(collection.COUPON_COLLECTION).updateOne({ Coupon: coupon },
                {
                    $push: {
                        Users: user
                    }
                }).then(() => {
                    db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                        db.get().collection(collection.ADDRESS_COLLECTION).insertOne(orderObj.deliveryDetails).then((respons) => {

                            resolve(response.insertedId)
                        })
                    })
                })
        })
    },
    placeOrderr: (order, products, total, method) => {
        let coupon = order.Coupon
        return new Promise((resolve, reject) => {
            console.log(order, products, total);
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let dateIso=new Date()
            let date = moment(dateIso).format('YYYY/MM/DD')
            let time= moment(dateIso).format('HH:mm:ss')
            let orderObj = {
                deliveryDetails: {
                    name: order.name,
                    address: order.address,
                    pincode: order.pincode,
                    mobile: order.mobile,
                    userId: objectId(order.userId)

                },
                userId: objectId(order.userId),
                paymentMethod: method,
                products: products,
                totalAmount: total,
                DateISO:dateIso,
                status: status,
                date: date,
                Time:time

            }
            let user = order.userId
            console.log("uss", user);
            db.get().collection(collection.COUPON_COLLECTION).updateOne({ Coupon: coupon },
                {
                    $push: {
                        Users: user
                    }
                }).then(() => {
                    db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {


                        // db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) })
                        resolve(response.insertedId)

                    })
                })
        })
    },
    getCartProductList: (userId) => {
        return new promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.products)
        })
    },
    getUserOrders: (userId) => {
        return new promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: objectId(userId) }).sort({ date: -1 }).toArray()
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new promise(async (resolve, reject) => {
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
    getProfile: (userId) => {
        return new promise(async (resolve, reject) => {
            let profile = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })

            resolve(profile)
        })
    },
    updateProfile: (userId, userDetails) => {

        return new promise(async (resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    Name: userDetails.Name,
                    Email: userDetails.Email,
                    number: userDetails.number
                }
            }).then((response) => {
                resolve()
            })
        })
    },
    changePassword: (details) => {
        console.log("amal", details);
        return new promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(details.userId) })
            console.log("achu", user);
            if (user) {
                bcrypt.compare(details.cPassword, user.Password).then(async (status) => {
                    if (status) {
                        details.nPassword = await bcrypt.hash(details.nPassword, 10)
                        db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(details.userId) }, {
                            $set: {
                                Password: details.nPassword
                            }
                        }).then((response) => {
                            if (response) {
                                resolve({ status: true, succPass: "Password changed" })
                            } else {
                                console.log("error");
                                resolve({ status: false, errorPass: "Password not updated" })
                            }
                        })

                    } else {
                        resolve({ status: false, errorPass: "Please enter the current Password properly" })
                    }

                })
            }
        })
    },
    cancelOrder: (orderId) => {
        return new Promise((resolve, reject) => {

            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: "Cancelled"
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },
    returnOrder: (orderId) => {
        return new Promise((resolve, reject) => {

            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: "Returned"
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },
    getAddressDetails: (userId) => {
        return new promise(async (resolve, reject) => {
            let address = await db.get().collection(collection.ADDRESS_COLLECTION).find({ userId: objectId(userId) }).toArray()
            console.log(address);
            resolve(address)
        })
    },
    getUserAddressDetails: (addressId) => {
        console.log("mm", addressId);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).findOne({ _id: objectId(addressId) }).then((address) => {
                console.log("llll", address);
                resolve(address)
            })
        })
    },
    updateAddress: (addressId, addressDetails) => {

        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).updateOne({ _id: objectId(addressId) }, {
                $set: {
                    name: addressDetails.name,
                    address: addressDetails.address,
                    pincode: addressDetails.pincode,
                    mobile: addressDetails.mobile

                }
            }).then((response) => {

                resolve()
            })
        })
    },
    deleteAddres: (addressId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).remove({ _id: objectId(addressId) }).then((response) => {
                console.log(response);
                resolve(response)
            })
        })
    },
    addAddress: (address) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).insertOne(address).then((data) => {
                resolve(data.insertedId)
            })
        })
    },
    generateRazorpay: (orderId, total) => {
        console.log("ord", orderId);
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Kavya", order);
                    resolve(order)
                }

            })
        })
    },
    verifyPayment: (details) => {
        console.log("details", details);
        return new promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'OQd4jUfe8uRSdSCSAGkQl5Cs')
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            console.log("syam", hmac);
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {

                resolve()
            } else {
                reject()
            }
        })
    },
    changePaymentStatus: (orderId) => {
        return new promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                $set: {
                    status: "placed"
                }
            }).then(() => {
                resolve()
            })
        })
    },
    categoryView: (categoryview) => {
        return new promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).find({ Category: categoryview }).toArray()
            resolve(product)
        })
    },


    relatedProducts: (categoryId) => {
        return new promise(async (resolve, reject) => {
          let category = await db
            .get()
            .collection(collection.PRODUCT_COLLECTION)
            .find({ Category: categoryId })
            .toArray();
          resolve(category);
        });
      },

    couponValidate: (data, user) =>  {
        console.log("fffff", user);
        var da = data
        console.log("da", da);
        return new Promise(async (res, rej) => {
            obj = {}
            let date = new Date()
            date = moment(date).format('YYYY-MM-DD')
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ Coupon: data.Coupon })
            console.log("c", coupon);
            if (coupon) {
                console.log("cou", coupon);
                console.log("u", user);
                let users = coupon.Users
                console.log("users", users);
                let userChecker = users.includes(user)
                console.log("chec", userChecker);
                if (userChecker) {
                    obj.couponUsed = true;
                    console.log("obj", obj);
                    res(obj)
                } else {
                    if (date <= coupon.Expiry) {
                        console.log("t", data);
                        let total = parseInt(data.Total)
                        let percentage = parseInt(coupon.Offer)
                        console.log("percentage", percentage);
                        let discountVal = ((total * percentage) / 100).toFixed()
                        console.log("discountval", discountVal);
                        obj.total = total - discountVal
                        obj.success = true
                        console.log("obj", obj)
                        res(obj)
                    } else {
                        obj.couponExpired = true
                        console.log("Expired");
                        res(obj)
                    }
                }
            } else {
                obj.invalidCoupon = true
                console.log("invalid");
                res(obj)

            }
        })
    },
    // ___The wallet section started____

    applyWallet: (val, userId) => {
        let value = parseInt(val)
        return new Promise((res, rej) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $inc: { wallet: -value } }).then((response) => {
                res(response)
            })
        })

    },
    clearCart: (id) => {
        return new Promise((res, rej) => {
            db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(id) }).then((response) => {
                res(response)
            })

        })
    },
    updateprofileImage: (id) => {
        return new promise(async (resolve, reject) => {
            await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(id) }, {
                $set: {
                    profile: true
                }
            }).then((response) => {

                resolve(response)
            })
        })
    }
}