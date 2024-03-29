import { bookingmodel } from "../model/booking";
import { StatusCode } from "../statuscode";
import { hotelmodel } from "../model/hotel";
import { imagemodel } from "../model/image";
import express, { Express, Request, Response } from 'express'
import { Usermodel } from "../model/users";

class BookingDomain {
    async addBooking(req: Request, res: Response) {
        var reqData: any = JSON.parse(JSON.stringify(req.headers['data']));

        try {
            var nextID: any = await bookingmodel.findOne({}, { _id: 1 }).sort({ _id: -1 });
            var noOfRoom: Number = req.body.room_id.length
            var bookIngData: object = {
                _id: nextID?._id == undefined ? 1 : Number(nextID?.id) + 1,
                user_id: reqData.uid,
                hotel_id: req.body.hotel_id,
                no_of_room: noOfRoom,
                room_id: req.body.room_id,
                checkin_date: new Date(req.body.checkin_date),
                checkout_date: new Date(req.body.checkout_date),
                price: {
                    number_of_nights: req.body.price.number_of_nights,
                    room_price: req.body.price.room_price,
                    gst: req.body.price.gst,
                    discount: req.body.price.discount,
                    total_price: req.body.price.total_price
                }
            }
            var sum = 0;
            var rommIdFromReq: any = (req.body.room_id);
            console.log(rommIdFromReq);
            var getHotelRoom = await hotelmodel.find({ _id: req.body.hotel_id })
            var roomPrice: any = [];
            getHotelRoom.forEach((e: any) => {
                e.room.forEach((d: any) => {
                    if (rommIdFromReq.includes(d.room_id)) {
                        roomPrice.push(d.price);
                        sum = sum +d.price;
                    }
                })
            })
            const getHotelRoomPrice: number = sum;
            console.log(getHotelRoom);
            console.log('price ' + getHotelRoomPrice);
            var totalPrize = (req.body.price.total_price);
            var noOfNight = (req.body.price.number_of_nights);
            var roomGstPrice = ((18 / 100) * (getHotelRoomPrice * noOfNight));
            var roomDiscountPrice = ((getHotelRoomPrice * noOfNight) + roomGstPrice) * 0.05;
            console.log(`gst ${roomGstPrice}`);
            console.log(`discount ${roomDiscountPrice}`);
            var roomTotalPrize = ((getHotelRoomPrice * noOfNight) - roomDiscountPrice + roomGstPrice)
            console.log('price ' + roomTotalPrize);
            console.log('total ' + totalPrize);
            if (roomTotalPrize == totalPrize) {
                var bookedData = new bookingmodel(bookIngData);
                console.log(bookedData);
                await bookedData.save();
                res.status(StatusCode.Sucess).send("Booking Success")
                res.end();
            }
            else {
                res.status(StatusCode.Not_Acceptable).send("Error in calculation");
            }
            res.end();
        } catch (err: any) {
            res.status(StatusCode.Server_Error).send(err.message);
            res.end();
        }
    }

    async roomBookAvailableCheck(req: Request, res: Response) {
        try {
            var q: any = req.query;
            const hotelId: string = q.hotel_id;
            const cIn: Date = new Date(q.cin);
            const cOut: Date = new Date(q.cout);
            const noofroom = q.no_of_room;
            const bookedId: any = [];
            const unAvailableRoomDupId: any = [];
            const unAvailableRoomId: any = [];
            const roomDetailList: any = [];
            var hotelName: any;
            //finding mattressprize
            var hotelMattress = await hotelmodel.findOne({ _id: parseInt(hotelId) }).select("mattressPrice");
            var hotelMattressPrize = hotelMattress?.mattressPrice ?? 0;
            //console.log(hotelMattressPrize);
            //booking table check checkIn and checkOut match with user checkIn & checkOut date
            const resData = await bookingmodel.find({
                $and: [{ hotel_id: hotelId },
                {
                    $or: [
                        { $and: [{ "checkin_date": { $lte: cIn } }, { "checkout_date": { $lte: cIn } }] },
                        { $and: [{ "checkin_date": { $gte: cOut } }, { "checkout_date": { $gte: cOut } }] }
                    ]
                }
                ]
            },
                {
                    "_id": 1,
                    "hotel_id": 1,
                    "checkin_date": 1,
                    "checkout_date": 1,
                    "room_id": 1
                });
            // console.log(resData);
            if (resData != null) {
                //booked ID from resData
                resData.forEach(e => {
                    bookedId.push(e._id);
                });
                const unAvailableBooking = await bookingmodel.find({ $and: [{ hotel_id: hotelId }, { _id: { $nin: bookedId } }] }, {
                    "_id": 1,
                    "hotel_id": 1,
                    "room_id": 1
                })
                //console.log("this is unavilablebooking " + unAvailableBooking);
                if (unAvailableBooking != null) {
                    //Available roomId 
                    unAvailableBooking.forEach(e => {
                        e.room_id.forEach(d => {
                            unAvailableRoomDupId.push(d);
                        })
                    })
                    //Duplication Remove in roomId
                    unAvailableRoomDupId.forEach((item: any) => {
                        if (!unAvailableRoomId.includes(item)) {
                            unAvailableRoomId.push(item);
                        }
                    })
                    // console.log("this unAvailableRoomId " + unAvailableRoomId);
                    var semiDeluxData: any;
                    var superDeluxData: any;
                    var deluxData: any;
                    //get hotel all room Id and subtract it from unAvailable
                    var hRoom = await hotelmodel.find({ _id: hotelId });
                    hRoom.forEach(e => {
                        hotelName = e.hotel_name;
                        e.room.forEach(c => {
                            if (!unAvailableRoomId.includes(c.room_id)) {
                                roomDetailList.push(c);
                            }
                            if (c.room_type == "Deluxe" && deluxData == null) {
                                deluxData = (JSON.parse(JSON.stringify(c)));
                            }
                            if (c.room_type == "Semi-Deluxe" && semiDeluxData == null) {
                                semiDeluxData = (JSON.parse(JSON.stringify(c)));
                            }
                            if (c.room_type == "Super-Deluxe" && superDeluxData == null) {
                                superDeluxData = (JSON.parse(JSON.stringify(c)));
                            }
                        });
                    })
                    var deluxImage = await imagemodel.find({ $and: [{ room_id: deluxData.room_id }, { hotel_id: hotelId }] });
                    var superDeluxImage = await imagemodel.find({ $and: [{ room_id: semiDeluxData.room_id }, { hotel_id: hotelId }] });
                    var semideluxImage = await imagemodel.find({ $and: [{ room_id: semiDeluxData.room_id }, { hotel_id: hotelId }] });
                    deluxData.image = deluxImage;
                    superDeluxData.image = superDeluxImage;
                    semiDeluxData.image = semideluxImage;

                    const newDeluxIDList: any = [];
                    const newsemiDeluxIDList: any = [];
                    const newSuperDeluxIDList: any = [];
                    roomDetailList.forEach((a: any) => {
                        if (a.room_type == "Deluxe") {
                            newDeluxIDList.push(a.room_id);
                        }
                        else if (a.room_type == "Semi-Deluxe") {
                            newsemiDeluxIDList.push(a.room_id);
                        }
                        else if (a.room_type == "Super-Deluxe") {
                            newSuperDeluxIDList.push(a.room_id);
                        }
                    });
                    var resultData = {
                        "hotel_id": hotelId,
                        "hotel_name": hotelName,
                        "hotelMattressPrize": hotelMattressPrize,
                        "deluxe_room_id": newDeluxIDList,
                        "deluxe": deluxData,
                        "semideluxe_room_id": newsemiDeluxIDList,
                        "semideluxe": semiDeluxData,
                        "superdeluxe_room_id": newSuperDeluxIDList,
                        "supedeluxe": superDeluxData,
                    };
                    res.status(StatusCode.Sucess).send(resultData);

                } else {
                    res.status(StatusCode.Sucess).send({})
                    res.end()
                }
            } else {
                res.status(StatusCode.Sucess).send({
                })
                res.end()
            }
        } catch (error: any) {
            res.status(StatusCode.Server_Error).send(error.message);
            res.end();
        }
    }


    async userBookingHistory(req: Request, res: Response) {
        try {
            var reqData: any = JSON.parse(JSON.stringify(req.headers['data']));
            var uid: String = reqData.uid;
            var bookingData = await bookingmodel.find({ "user_id": uid });
            var hotelIdList: any = [];
            var bookingHistoryData: any = [];
            if (bookingData != null) {
                bookingData.forEach(e => {
                    hotelIdList.push(e.hotel_id);
                })
                var hotelData = await hotelmodel.aggregate([
                    {
                        $match: {
                            _id: { $in: hotelIdList }
                        }
                    },
                    {
                        $lookup: {
                            from: "images",
                            localField: "_id",
                            foreignField: "hotel_id",
                            pipeline: [
                                { $match: { room_id: null } }
                            ],
                            as: "images",
                        },
                    },
                    {
                        "$project": {
                            "hotel_id": "$_id",
                            "hotel_name": "$hotel_name",
                            "address": "$address",
                            'images': "$images"
                        }
                    },

                ]);

                bookingData.forEach(e => {
                    hotelData.forEach(d => {
                        if (e.hotel_id == d._id) {
                            bookingHistoryData.push({
                                "hotel_id": d._id,
                                "hotel_name": d.hotel_name,
                                "address": d.address,
                                'images': d.images,
                                "price": e.price?.total_price,
                                "no_of_room": e.no_of_room,
                                "number_of_nights":e.price?.number_of_nights,
                                "room_price": e.price?.room_price,
                                "discount": e.price?.discount,
                                 "gst": e.price?.gst,
                                 "booked_date": e.booked_date,
                                "checking_date": e.checkin_date,
                                "checkout_date": e.checkout_date
                            })
                        }
                    })
                })

                res.status(StatusCode.Sucess).send(bookingHistoryData);

            } else {
                res.status(StatusCode.Sucess).send([])
                res.end()
            }
        } catch (e: any) {
            res.status(StatusCode.Server_Error).send(e.message);
            res.end();
        }
    }

    async getRoomPrize(req: Request, res: Response) {
        var query: any = req.query;
        var roomid: any = query.roomid.split(",").map(Number);
        var hotelid: any = query.hotelid
        var adults:any = query.adults
        console.log("roomid",roomid.length);
       var noOfPersonforRoom = ((roomid.length) * 2);
       var countOfMattress:any = ((adults - noOfPersonforRoom) < 0 ) ? 0 : (adults - noOfPersonforRoom);
       console.log("countOfMattress" ,countOfMattress);
        var getHotelRoom = await hotelmodel.find({ _id: hotelid })
        var hotelId = parseInt(getHotelRoom[0]._id.toString());
        var hotelName = getHotelRoom[0].hotel_name.toString();
        var address = getHotelRoom[0].address?.address_line;
        var rating = parseInt(getHotelRoom[0].rating.toString());
        var roomPrice: any = [];
        var sum = 0;
        var hotelMattress = await hotelmodel.findOne({ _id: hotelid }).select("mattressPrice");
        console.log(hotelMattress!.mattressPrice);
        var hotelMattressPrize = hotelMattress?.mattressPrice ?? 0;
        getHotelRoom.forEach((e: any) => {
            e.room.forEach((d: any) => {
                if (roomid.includes(d.room_id)) {
                    roomPrice.push(d.price);
                    sum = sum + d.price;
                }
            })
        })
        console.log(countOfMattress);
        var totalMattressPrize = hotelMattressPrize * countOfMattress;
        console.log(totalMattressPrize);
        var checkInDate = new Date(query.cin);
        var checkOutDate = new Date(query.cout);
        var diff = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
        var diffDays = Math.ceil(diff / (1000 * 3600 * 24));
        var getHotelRoomPrice = sum;
        var totalHotelRoomPrize = getHotelRoomPrice + totalMattressPrize;
        var roomPrizwWithDays = totalHotelRoomPrize * diffDays;
        var gstPercentage = 18;
        var discountPercentage = 5;
        var roomPriceWithGst = (roomPrizwWithDays * (gstPercentage / 100));
        var discountPrice = (roomPrizwWithDays + roomPriceWithGst) * (discountPercentage / 100);
        var totalRoomPrice = (roomPrizwWithDays + roomPriceWithGst - discountPrice);
        var roomPriceData = {
            hotelid: hotelId,
            hotelName: hotelName,
            address: address,
            rating: rating,
            checkInDate: query.cin,
            checkOutDate: query.cout,
            roomId: roomid,
            roomPrice: Math.floor(getHotelRoomPrice),
            noOfmatress: countOfMattress,
            matressPrize: Math.floor(totalMattressPrize),
            noOfDays: diffDays,
            subTotal: Math.floor(roomPrizwWithDays),
            gstPercentage: gstPercentage,
            discountPercentage: discountPercentage,
            gst: Math.floor(roomPriceWithGst),
            offer: Math.floor(discountPrice),
            total: Math.floor(totalRoomPrice)

        }
        res.send(roomPriceData);



    }

    async bookingFreeze(req: Request, res: Response, cIn: string, cOut: string, roomId: any, hotelId: any,orderId:any,price:any,coupon_id:any) {
        var reqData: any = JSON.parse(JSON.stringify(req.headers['data']));
        try {
            if (roomId.length != 0) {
                var cin=new Date(cIn);
                var cout=new Date(cOut);
                var nextID: any = await bookingmodel.findOne({}, { _id: 1 }).sort({ _id: -1 });
                var diff = Math.abs(cout.getTime() - cin.getTime());
                var diffDays = Math.ceil(diff / (1000 * 3600 * 24));
                var bookIngData: object = {
                    _id: nextID?._id == undefined ? 1 : Number(nextID?.id) + 1,
                    user_id: reqData.uid,
                    hotel_id: hotelId,
                    no_of_room: roomId.length,
                    room_id: roomId,
                    checkin_date: new Date(cin),
                    checkout_date: new Date(cout),
                    price: {
                        number_of_nights: diffDays,
                        room_price: price.room_price,
                        gst: price.gst,
                        discount: price.discount,
                        total_price: price.total_price
                    },
                    coupon_id:coupon_id,
                    status: "pending",
                    paymentId: null,
                    orderId: orderId
                }
                var bookedData = new bookingmodel(bookIngData);
                console.log(bookedData);
                await bookedData.save(); 
                return nextID?._id == undefined ? 1 : Number(nextID?.id) + 1;
            }else{
                return 0;
            }
        } catch (err: any) {
            res.status(StatusCode.Server_Error).send(err.message);
            res.end();
        }
    }

    async bookingFreezFail(bookingId:any){

        try{
            console.log('timer');
            await bookingmodel.deleteOne({$and:[{_id:bookingId},{status:"pending"}]});
            console.log('deleted')
        }catch(e:any){
            
        }

    }
    async getAllBookingAdmin(req: Request, res: Response) {
        var reqData: any = JSON.parse(JSON.stringify(req.headers['data']));
        var uid: string = reqData.uid;
        var userData = await Usermodel.find({ _id: uid }).select("-__v");
        if (userData[0].user_type == "admin") {
            var q: any = req.query;
            var pageSize: any = req.query.pagesize;
            var page: any = req.query.page;
            var hotelName: any = req.query.hotelname;

            let todayDate = new Date();
            var checkIndata: any = ((req.query.date1) == "" ? todayDate : (req.query.date1));

            var newCheckIndate = new Date(checkIndata);
            console.log(newCheckIndate);
            var hotelid: any = await hotelmodel.findOne({ hotel_name: { $regex: hotelName + '.*', $options: 'i' } })
            var allHotelId: any = await hotelmodel.find().select("_id");
            var allHotelIdarr: any = [];
            allHotelId.forEach((e: any) => {
                allHotelIdarr.push(e._id);
            });
            var hotelIdtoSearch: any = [];
            var hotelId: Number = hotelid?._id;
            hotelIdtoSearch.push(hotelId);
            var hotelIdFind = (hotelName == "" ? allHotelIdarr : hotelIdtoSearch);
 
            var date2: any = req.query.date2;
            var newCheckOutdata = new Date(date2);

            var userName = req.query.username;
            var userId = await Usermodel.findOne({ user_name: { $regex: userName + '.*', $options: 'i' } })
            var userIdarr: any = [];
            var allUserIdarr: any = [];
            userIdarr.push(userId?._id);
            var allUserid: any = await Usermodel.find().select("_id");
            allUserid.forEach((e: any) => {
                allUserIdarr.push(e._id);
            })
            var userIdsearch = ((req.query.username) == "" ? allUserIdarr : userIdarr);
   

            if (date2) {
                var allBookingData = await bookingmodel.aggregate([
                    {
                        $match: {
                            $and: [
                                { "checkin_date": { $gte: newCheckIndate } },

                                { "checkin_date": { $lte: newCheckOutdata } },

                                { "hotel_id": { $in: hotelIdFind } },

                                { "user_id": { $in: userIdsearch } }


                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'user_id',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        user_name: 1,
                                        user_email: 1,
                                        user_image: 1
                                    }
                                }
                            ],
                            as: 'userdata'
                        }
                    },
                    {
                        $lookup: {
                            from: 'hotels',
                            localField: 'hotel_id',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        hotel_name: 1
                                    }
                                }
                            ],
                            as: 'hoteldata'
                        }
                    },
                ]).skip((parseInt(pageSize) * parseInt(page))).limit(parseInt(pageSize))

                if (allBookingData) {
                    res.send(allBookingData);
                }
                else {
                    res.send([]);
                }
            } else {
                var allBookingData = await bookingmodel.aggregate([
                    {
                        $match: {
                            $and: [
                                { "checkin_date": { $gte: newCheckIndate } },
                                { "hotel_id": { $in: hotelIdFind } },
                                { "user_id": { $in: userIdsearch } }
                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'user_id',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        user_name: 1,
                                        user_email: 1,
                                        user_image: 1

                                    }
                                }
                            ],
                            as: 'userdata'
                        }
                    },
                    {
                        $lookup: {
                            from: 'hotels',
                            localField: 'hotel_id',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        hotel_name: 1
                                    }
                                }
                            ],
                            as: 'hoteldata'
                        }
                    },
                ]).skip((parseInt(pageSize) * parseInt(page))).limit(parseInt(pageSize))

                if (allBookingData) {
                    res.send(allBookingData);
                }
                else {
                    res.send([]);
                }

            }
        } else {
            res.status(StatusCode.Unauthorized).send("you are not authorize")
        }

    }


}

export { BookingDomain };