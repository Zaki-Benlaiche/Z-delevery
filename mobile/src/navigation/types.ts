/** تعريفات المسارات وملقّماتها */

export type AuthStackParamList = {
  Login: undefined;
  Otp: { phone: string; devOtp: string | null };
};

export type AppTabParamList = {
  HomeTab: undefined;
  OrdersTab: undefined;
  AccountTab: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  Merchant: { merchantId: string };
  Cart: undefined;
  Addresses: { picking?: boolean } | undefined;
  AddAddress: undefined;
  OrderTracking: { orderId: string };
};
