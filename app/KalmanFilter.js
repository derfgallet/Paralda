/**
 * Created by fredericgallet on 21/10/2017.
 */

function KalmanFilter() {
    if (!(this instanceof KalmanFilter))
        return new KalmanFilter();


    this.Q_angle = 0.001;
    this.Q_bias = 0.003;
    this.R_measure = 0.03;

    this.angle = 0.0; // Reset the angle
    this.bias = 0.0; // Reset bias

// Since we assume that the bias is 0 and we know the starting angle (use setAngle), the error
// covariance matrix is set like so -
// see: http://en.wikipedia.org/wiki/Kalman_filter#Example_application.2C_technical

    this.P=[[0.0,0.0],[0.0,0.0]];
}

KalmanFilter.prototype.setAngle = function (pangle) { angle=pangle; };

KalmanFilter.prototype.getRate = function () {return rate;};

KalmanFilter.prototype.setQangle = function (pQangle) {Q_angle=pQangle;};

KalmanFilter.prototype.setQbias = function (pQbias) {Q_bias=pQbias;};

KalmanFilter.prototype.setRmeasure = function (pRmeasure) {R_measure=pRmeasure;};

KalmanFilter.prototype.getQangle = function () {return Q_angle;};

KalmanFilter.prototype.getQbias = function () {return Q_bias;};

KalmanFilter.prototype.getRmeasure = function () {return R_measure;};

// The angle should be in degrees and the rate should be in degrees per second and the delta time in seconds
KalmanFilter.prototype.getAngle = function (newAngle,newRate,dt)
{
    /* Step 1 */
    var rate = newRate - bias;
    angle += dt * rate;

    // Update estimation error covariance - Project the error covariance ahead
    /* Step 2 */
    P[0][0] += dt * (dt*P[1][1] - P[0][1] - P[1][0] + Q_angle);
    P[0][1] -= dt * P[1][1];
    P[1][0] -= dt * P[1][1];
    P[1][1] += Q_bias * dt;

    // Discrete Kalman filter measurement update equations - Measurement Update ("Correct")
    // Calculate Kalman gain - Compute the Kalman gain
    /* Step 4 */
    var S = P[0][0] + R_measure; // Estimate error
    /* Step 5 */
    var K=[P[0][0] / S,P[1][0] / S]; // Kalman gain - This is a 2x1 vector
    // K[0] = P[0][0] / S;
    // K[1] = P[1][0] / S;

    // Calculate angle and bias - Update estimate with measurement zk (newAngle)
    /* Step 3 */
    var y = newAngle - angle; // Angle difference
    /* Step 6 */
    angle += K[0] * y;
    bias += K[1] * y;

    // Calculate estimation error covariance - Update the error covariance
    /* Step 7 */
    var P00_temp = P[0][0];
    var P01_temp = P[0][1];

    P[0][0] -= K[0] * P00_temp;
    P[0][1] -= K[0] * P01_temp;
    P[1][0] -= K[1] * P00_temp;
    P[1][1] -= K[1] * P01_temp;

    return angle;
};

module.exports = KalmanFilter;