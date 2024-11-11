const Coupon = require('../../model/couponModel')

const couponPage = async (req, res) => {
    const coupon= await Coupon.find({})
    res.render("admin/coupon",{coupons:coupon});
    
};


const addCoupon = async (req, res) => {
    try {
        console.log("hiii")
        const { couponName, couponPercentage, minPurchase, addDate, expiryDate } = req.body;
        console.log(req.body)
        if (!couponName || !couponPercentage || couponPercentage <= 0 || couponPercentage > 100 || !expiryDate) {
            return res.status(400).json({ message: 'Invalid coupon data. Please provide valid details.' });
        }

        // Add coupon to the database
        const newCoupon = new Coupon({
            couponName,
            couponPercentage,
            minPurchase,
            addedDate: addDate || new Date(),
            expiryDate
        });

        await newCoupon.save();

        return res.status(200).json({ message: 'Coupon added successfully.' });
    } catch (error) {
        console.error('Error adding coupon:', error);
        res.render("layout/404");
    }
};

const editCoupon = async (req, res) => {
    try {
        const { couponId, couponName, couponPercentage, minPurchase, addDate, expiryDate } = req.body;

        // Find and update the coupon by ID
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId, 
            {
                couponName,
                couponPercentage,
                minPurchase,
                addedDate: new Date(addDate), 
                expiryDate: new Date(expiryDate)
            }, 
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.status(200).json({ message: 'Coupon updated successfully', updatedCoupon });
    } catch (error) {
        console.error(error);
        res.render("layout/404");
    }
};

const deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

        if (!deletedCoupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error(error);
        res.render("layout/404");
    }
};

module.exports={couponPage,addCoupon ,editCoupon,deleteCoupon}