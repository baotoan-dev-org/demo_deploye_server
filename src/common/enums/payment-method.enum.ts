export enum PaymentMethod {
  CREDIT_CARD = 'Credit Card', // Thanh toán bằng thẻ tín dụng
  DEBIT_CARD = 'Debit Card', // Thanh toán bằng thẻ ghi nợ
  BANK_TRANSFER = 'Bank Transfer', // Chuyển khoản ngân hàng
  PAYPAL = 'PayPal', // Thanh toán qua PayPal
  COD = 'Cash on Delivery', // Thanh toán khi nhận hàng
  E_WALLET = 'E-Wallet', // Thanh toán qua ví điện tử (e.g., Momo, ZaloPay)
  CRYPTOCURRENCY = 'Cryptocurrency', // Thanh toán bằng tiền mã hóa (e.g., Bitcoin, Ethereum)
  GIFT_CARD = 'Gift Card', // Thanh toán bằng thẻ quà tặng
  OTHER = 'Other', // Phương thức thanh toán khác
}
