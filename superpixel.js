

const { Image } = require('image-js');

function convertToLAB(rgbImage) {
    const labImage = [];
    for (let i = 0; i < rgbImage.length; i++) {
        const row = [];
        for (let j = 0; j < rgbImage[i].length; j++) {
            const [r, g, b] = rgbImage[i][j];
            const [l, a, bb] = rgb2lab([r, g, b]);
            row.push([l, a, bb]);
        }
        labImage.push(row);
    }
    return labImage;
}

// RGB to LAB conversion function (adapted from https://github.com/d3/d3-color/blob/master/src/lab.js)
function rgb2lab(rgb) {
    let r = rgb[0] / 255,
        g = rgb[1] / 255,
        b = rgb[2] / 255,
        x,
        y,
        z;

    r = rgb[0] > 0.04045 ? Math.pow((rgb[0] + 0.055) / 1.055, 2.4) : rgb[0] / 12.92;
    g = rgb[1] > 0.04045 ? Math.pow((rgb[1] + 0.055) / 1.055, 2.4) : rgb[1] / 12.92;
    b = rgb[2] > 0.04045 ? Math.pow((rgb[2] + 0.055) / 1.055, 2.4) : rgb[2] / 12.92;

    x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
    y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / 1;
    z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;

    x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787037 * x + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787037 * y + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787037 * z + 16 / 116;

    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}




// Function to get optimized cluster centers
function getOptimizedClusterCenters(image, width, height,  K) {
    // const height = image.length;
    // const width = image[0].length;
    
    const S = Math.floor(Math.sqrt((height * width) / K));
    const clusterCenters = [];

    // Iterate over the image to find cluster centers
    for (let i = 0; i < height - S; i += S) {
        for (let j = 0; j < width - S; j += S) {
            const centerI = i + Math.floor(S / 2);
            const centerJ = j + Math.floor(S / 2);
            clusterCenters.push({ i: centerI, j: centerJ });
        }
    }

    // Return the array of cluster centers
    return clusterCenters;
}


function slicSuperpixels(imageData, width, height, K, m, numIterations = 3) {
    // Convert the image data to LAB color space
    const labImage = convertToLAB(imageData);

    const N = height * width; // Total number of pixels in the image
    const A = N / K; // Area of superpixel
    const S = Math.floor(Math.sqrt(A)); // Length of each superpixel

    // Calculate cluster centers
    const clusterCenters = getOptimizedClusterCenters(imageData, width, height, K);
    // Initialize labels and distances arrays
    const labels = Array.from({ length: height }, () => Array(width).fill(-1));
    const distances = Array.from({ length: height }, () => Array(width).fill(Infinity));

    const spatialScale = m / S;

    // SLIC algorithm
    for (let iteration = 0; iteration < numIterations; iteration++) {
    
        clusterCenters.forEach((center, ci) => {
            const { i: cx, j: cy } = center;
            // Search in 2S range
        

            for (let i = Math.max(0, cx - S); i < Math.min(height, cx + S); i++) {
                for (let j = Math.max(0, cy - S); j < Math.min(width, cy + S); j++) {
                    const dLab = calculateLabDistance(labImage[cx][cy], labImage[i][j]);
                    const dSpatial = calculateSpatialDistance([cx, cy], [i, j]);
                     //const d = dLab + spatialScale * dSpatial;
                 
                     const d = dSpatial;
                 
                    if (d < distances[i][j]) {
                        distances[i][j] = d;
                        labels[i][j] = ci;
                    }
                }
            }
        });
       console.log(distances[0][0])

        // Update cluster centers
        clusterCenters.forEach((center, ci) => {
            const members = [];
            for (let i = 0; i < height; i++) {
                for (let j = 0; j < width; j++) {
                    if (labels[i][j] === ci) {
                        members.push([i, j]);
                    }
                }
            }
            if (members.length > 0) {
                const newCenter = members.reduce(([sumX, sumY], [x, y]) => [sumX + x, sumY + y], [0, 0]);
                clusterCenters[ci] = {
                    x: Math.floor(newCenter[0] / members.length),
                    y: Math.floor(newCenter[1] / members.length)
                };
            }
        });
    }



// console.log(clusterCenters)
    // Create the final image

let final_image = new Array(height);
for (let i = 0; i < height; i++) {
    final_image[i] = new Array(width);
    for (let j = 0; j < width; j++) {
        final_image[i][j] = [0, 0, 0]; // Initialize each pixel as [0, 0, 0]
    }
}
// clusterCenters.forEach((center, ci) => {
//     const members = [];
    
//     for (let i = 0; i < height; i++) {
//         for (let j = 0; j < width; j++) {
//             if (labels[i][j] === ci) {
//                 members.push({ x: i, y: j, color: imageData[i][j] }); // Store coordinates and color
//             }
//         }
//     }

//     if (members.length > 0) {
//         const meanColors = members[0].color.map((_, channel) =>
//             members.reduce((sum, pixel) => sum + pixel.color[channel], 0) / members.length
//         );
    
//         members.forEach(pixel => {
//             const { x, y } = pixel;
   
//             finalImage[x][y] = meanColors; // Set mean color at the pixel's position
            
//         });
//     }
// });
// Assuming you have defined 'final_image', 'labels', and 'image' arrays earlier
// console.log(clusterCenters)
// console.log(labels)
for (let ci = 0; ci < clusterCenters.length; ci++) {
    let members = where(labels, ci, height, width)
    if (ci ==99){
        // console.log("aa", members)
    }
    if (members.length > 0) {
    //     for (let channel = 0; channel < 3; channel++) { // Assuming image has 3 channels
    //         let sum = 0;
    //         for (let i = 0; i < members.indx.length; i++) {
    //             let pixX = members.indx[i];
    //             let pixY = members.indy[i];
    //             let pixelIndex = pixX*width+pixY
    //             sum += imageData[pixelIndex][channel];
    //         }
    //         let mean = sum / members.length;
    //         for (let i = 0; i < members.length; i++) {
    //             let pixX = members.indx[i];
    //             let pixY = members.indy[i];
    //             let pixelIndex = pixX*width+pixY
    //             final_image[pixelIndex][channel] = mean;
    //         }
    //     }
    
        mean_r = 0;
        mean_g = 0;
        mean_b = 0;
        for (let i = 0; i < members.length; i++){
            x = members[i][0]; 
            
            y = members[i][1]; 
            
            mean_r += imageData[x][y][0]
            mean_g += imageData[x][y][1]
            mean_b += imageData[x][y][2]
            // if (x == 700 && y == 0){
            //     console.log("700", ci);
            // }
            
        }
        mean_r /= members.length; 
        mean_g /= members.length; 
        mean_b/= members.length; 
        // if (ci == 0){
        //     console.log("99", mean_r, mean_g, mean_b)
        // }
        
        for (let i = 0; i < members.length; i++){
            x = members[i][0]; 
            y = members[i][1]; 
            final_image[x][y][0] = mean_r;
            final_image[x][y][1] = mean_g;
            final_image[x][y][2] = mean_b;

        }
        
    
    }
}

    console.log(imageData[603][1])

    return final_image;
}



function calculateLabDistance(pt1, pt2){
    return Math.sqrt(((pt1[0] - pt2[0])**2) + ((pt1[1] - pt2[1])**2) + ((pt1[2] - pt2[2])**2)); 
}

function calculateSpatialDistance([cx, cy], [i, j]){
    return Math.sqrt (((cx - i)**2) + ((cy - j)**2))
}

function where(labels, ci) {
    let indx = [];
    let indy = [];
    const height = labels.length;
    const width = labels[0].length;

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (ci == 0 && i == 700 && j == 0){
                console.log(labels[i][j])
                console.log(ci)
                console.log(labels[i][j] === ci)
            }
            if (labels[i][j] === ci) {
                indx.push(i);
                indy.push(j);
            }
        }
    }

    // Create a 2D array using indx and indy
    let result = [];
    for (let i = 0; i < indx.length; i++) {
        result.push([indx[i], indy[i]]);
    }

    return result;
}




// Load the image using image-js
Image.load('Joe.png')
    .then(async (image) => {
        // Get image dimensions
        const dimensions = await getImageDimensions('Joe.png');
        if (!dimensions) {
            console.error('Error: Unable to get image dimensions');
            return;
        }
        // console.log(image)

        // Assign dimensions to global variables
        const height = dimensions.height;
        const width = dimensions.width;
        
        // Convert the image to a 3D array of RGB pixel values
        console.log(image)
        const imageData = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                // Get the pixel data at coordinates (x, y)
                const pixelData = image.getPixel(x, y);
                
                // Extract the RGB values from the pixel data
                // if (x == 0){
                //     console.log(pixelData)
                // }
                const r = pixelData[0];
                const g = pixelData[1];
                const b = pixelData[2];
                
                // Push an array containing the RGB values into the row array
                row.push([r, g, b]);
            }
            // Push the row array into the imageData array
            imageData.push(row);
        }
        console.log(imageData)
        // Provided arrays
        // Provided arrays
        // Set parameters for SLIC algorithm
        const K = 120; // Number of desired superpixels
        const m = 4; // Constant controlling spatial distance
        const numIterations = 6; // Number of iterations for SLIC algorithm

        // Apply SLIC algorithm to the image
        const superpixelizedImage = slicSuperpixels(imageData, width, height, K, m, numIterations);
      
        // Create a new image-js image from the superpixelized data
        const outputImage = new Image(width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const [r, g, b] = superpixelizedImage[y][x];
            
                // outputImage.setPixelXY(x, y, { r, g, b });
                //index=(y×width+x)×numChannels
                const index = (y * width + x)* 4;
                outputImage.data[index] = r; 
                outputImage.data[index + 1] = g; 
                outputImage.data[index + 2] = b; 
            }
        }
    

        // Save the output image
        outputImage.save('output_image.jpg')
            .then(() => {
                console.log('Superpixelization completed. Output saved as output_image.jpg');
            })
            .catch(error => {
                console.error('Error:', error);
            });
    })
    .catch(error => {
        console.error('Error:', error);
    });






async function getImageDimensions(imagePath) {
    try {
        // Load the image asynchronously
        const image = await Image.load(imagePath);
        
        // Extract width and height from the loaded image
        const width = image.width;
        const height = image.height;

        // Return an object containing width and height
        return { width, height };
    } catch (error) {
        // Handle any errors that may occur during the process
        console.error('Error:', error);
        return null;
    }
}

