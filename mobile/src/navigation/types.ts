/** تعريفات المسارات وملقّماتها */

export type AuthStackParamList = {
  Login: undefined;
  Otp: { phone: string; devOtp: string | null };
};

export type AppTabParamList = {
  HomeTab: undefined;
  FavoritesTab: undefined;
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

export type DriverTabParamList = {
  DriverHomeTab: undefined;
  DriverHistoryTab: undefined;
  DriverAccountTab: undefined;
};

export type DriverStackParamList = {
  DriverTabs: undefined;
  DriverOrder: { orderId: string };
};
