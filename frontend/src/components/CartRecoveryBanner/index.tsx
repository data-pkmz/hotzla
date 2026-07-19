import React from 'react';

interface CartRecoveryBannerProps {
  onRestore: () => void;
  onDismiss: () => void;
}

export const CartRecoveryBanner: React.FC<CartRecoveryBannerProps> = ({ onRestore, onDismiss }) => {
  return (
    <div
      className="cart-recovery-banner"
      style={{
        background: '#fff3e0',
        border: '1px solid #ffe0b2',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '16px 0',
      }}
    >
      <div>שמנו לב שיש לך פריטים בעגלה מהביקור הקודם. תרצה להמשיך מהיכן שהפסקת?</div>
      <div>
        <button onClick={onRestore} style={{ marginLeft: '8px' }}>
          המשך קנייה
        </button>
        <button onClick={onDismiss}>התעלם</button>
      </div>
    </div>
  );
};
export default CartRecoveryBanner;
