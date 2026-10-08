import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import productReducer from "../features/products/productSlice";
import cartReducer from "../features/cart/cartSlice";
import orderReducer from "../features/orders/orderSlice";
import userReducer from "../features/users/userSlice";
import eventReducer from "../features/events/eventSlice";
import categoryReducer from "../features/categories/categorySlice";
import paymentReducer from "../features/payment/paymentSlice";
import favoritesReducer from "../features/favorites/favoritesSlice";
import inquiryReducer from "../features/inquiry/inquirySlice";
import reviewReducer from "../features/review/reviewSlice";
import replacementReducer from "../features/replacement/replacementSlice";
import employeeReducer from "../features/employees/employeeSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productReducer,
    cart: cartReducer,
    orders: orderReducer,
    users: userReducer,
    events: eventReducer,
    categories: categoryReducer,
    payment: paymentReducer,
    favorites: favoritesReducer,
    inquiry: inquiryReducer,
    review:       reviewReducer,
    replacement:  replacementReducer,
    employees:    employeeReducer,
  },
});

export default store;
