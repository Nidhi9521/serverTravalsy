import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { verifyToken, checkRequest } from "./authentication/verify_token";
import * as admin from 'firebase-admin';
import credential from "./travelproject22-6b9d4-firebase-adminsdk-2wiay-c9c1876710.json";
import { LoggerMiddleware } from './middlewear/logger';

const app: Express = express();
const connection = mongoose.connect('mongodb+srv://akash:akash@cluster0.4gzjhma.mongodb.net/mmt');
dotenv.config();
const port = process.env.PORT;
app.use(express.json());
app.use(LoggerMiddleware);

// ROUTER
import { router as hotelroute } from './controller/hotel_controller';
import { router as tourroute } from './controller/tour_controller';
import { router as cityroute } from './controller/city_controller';
import { router as Roomrouter } from './controller/room_controller';
import { router as UserRouter } from './controller/user_controller';
import { router as reviewroute } from './controller/review_controller';
import { router as bookingroute } from './controller/booking_controller';
import { router as bookmarkroute } from './controller/bookmark_controller';
import {router as paymentroute}  from './controller/payment_controller';
import { router as couponroute} from './controller/coupon_controller';
import cors from "cors";

const allowedOrigins = ['*'];
const options: cors.CorsOptions = {
    origin: '*',
    methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH','OPTIONS'],
    credentials: true,
    allowedHeaders:"Origin,Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,locale",
    exposedHeaders:"*",
    maxAge:3600
  };
  // Then pass these options to cors:
app.use(cors(options));
// FIREBASE INTITIALIZE
admin.initializeApp(
    {
        credential: admin.credential.cert(JSON.parse(JSON.stringify(credential)))
    }
);

// TOKEN VERIFICATION CALL
app.use(verifyToken, checkRequest);

// ROOT LEVEL
app.get('/', (req: Request, res: Response) => {
    res.send('MMT Backend development');
    res.end();
});

// USE
app.use('/hotel', hotelroute);
app.use('/room', Roomrouter);
app.use('/tour', tourroute);
app.use('/city', cityroute);
app.use('/user', UserRouter)
app.use('/review', reviewroute);
app.use('/booking', bookingroute);
app.use('/bookmark', bookmarkroute);
app.use('/payment',paymentroute);
app.use('/coupon', couponroute);



// LISTEN
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at ${port}`);
});