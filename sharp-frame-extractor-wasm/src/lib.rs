use wasm_bindgen::prelude::*;
use web_sys::console;

// Compute similarity with a color
#[wasm_bindgen]
pub fn calculate_color_similarity(frame_data: &mut [u8], target_color: &[u8]) -> f32 {
    let length = frame_data.len();
    if length == 0 {
        console::log_1(&"Error: Frame data is empty.".into());
        return 0.0;
    }

    if target_color.len() != 3 {
        console::log_1(&"Error: Target color should have exactly 3 components (R, G, B).".into());
        return 0.0;
    }

    let target_red = target_color[0] as f32;
    let target_green = target_color[1] as f32;
    let target_blue = target_color[2] as f32;

    let mut frame_similarity = 0.0;
    let mut pixel_count = 0;

    // Iterate through each pixel and compute similarity to the target color
    for i in (0..length).step_by(4) {
        let red = frame_data[i] as f32;
        let green = frame_data[i + 1] as f32;
        let blue = frame_data[i + 2] as f32;

        // Compute similarity based on Euclidean distance (normalized)
        let distance = ((red - target_red).powi(2)
            + (green - target_green).powi(2)
            + (blue - target_blue).powi(2))
        .sqrt();

        // Inverse of distance to get similarity (smaller distance = higher similarity)
        frame_similarity += 1.0 / (1.0 + distance);
        pixel_count += 1;
    }

    // Compute average similarity, ensure we don't divide by zero
    if pixel_count > 0 {
        frame_similarity /= pixel_count as f32;
    } else {
        console::log_1(&"Error: No valid pixels in frame data.".into());
        return 0.0;
    }

    frame_similarity
}

#[wasm_bindgen]
pub fn average_color(frame_data: &mut [u8]) -> JsValue {
    let length = frame_data.len();
    if length == 0 {
        console::log_1(&"Error: Frame data is empty.".into());
        return JsValue::NULL;
    }

    let mut total_r = 0u64;
    let mut total_g = 0u64;
    let mut total_b = 0u64;
    let pixel_count = (length / 4) as u64;

    // Iterate through each pixel and accumulate color values
    for i in (0..length).step_by(4) {
        total_r += frame_data[i] as u64;
        total_g += frame_data[i + 1] as u64;
        total_b += frame_data[i + 2] as u64;
    }

    // Compute average color
    let avg_r = (total_r / pixel_count) as u8;
    let avg_g = (total_g / pixel_count) as u8;
    let avg_b = (total_b / pixel_count) as u8;

    // Create a JavaScript object to return the color
    let color = js_sys::Object::new();
    js_sys::Reflect::set(&color, &"r".into(), &avg_r.into()).unwrap();
    js_sys::Reflect::set(&color, &"g".into(), &avg_g.into()).unwrap();
    js_sys::Reflect::set(&color, &"b".into(), &avg_b.into()).unwrap();

    color.into()
}

#[wasm_bindgen]
pub fn average_color_per_line(frame_data: &mut [u8], width: usize) -> JsValue {
    let length = frame_data.len();
    if length == 0 {
        console::log_1(&"Error: Frame data is empty.".into());
        return JsValue::NULL;
    }

    let height = length / (width * 4);
    if height == 0 {
        console::log_1(&"Error: Invalid frame dimensions.".into());
        return JsValue::NULL;
    }

    // Create an array to store the average color for each horizontal line
    let avg_colors = js_sys::Array::new();

    // Iterate through each horizontal line
    for y in 0..height {
        let mut total_r = 0u64;
        let mut total_g = 0u64;
        let mut total_b = 0u64;

        // Iterate through each pixel in the horizontal line
        for x in 0..width {
            let i = (y * width + x) * 4;
            total_r += frame_data[i] as u64;
            total_g += frame_data[i + 1] as u64;
            total_b += frame_data[i + 2] as u64;
        }

        // Compute average color for the horizontal line
        let pixel_count = width as u64;
        let avg_r = (total_r / pixel_count) as u8;
        let avg_g = (total_g / pixel_count) as u8;
        let avg_b = (total_b / pixel_count) as u8;

        // Create a JavaScript object to represent the color
        let color = js_sys::Object::new();
        js_sys::Reflect::set(&color, &"r".into(), &avg_r.into()).unwrap();
        js_sys::Reflect::set(&color, &"g".into(), &avg_g.into()).unwrap();
        js_sys::Reflect::set(&color, &"b".into(), &avg_b.into()).unwrap();

        // Add the color object to the array
        avg_colors.push(&color);
    }

    avg_colors.into()
}

#[wasm_bindgen]
pub fn compute_sharpness(frame_data: &mut [u8], width: usize, height: usize) -> f32 {
    let gray = to_grayscale(frame_data);

    // Laplacian variance: sharp frames have crisp edges (high variance),
    // motion-blurred frames have smooth gradients (low variance).
    // This is scene-content-independent, unlike summing edge energy.
    let mut responses = Vec::with_capacity((width - 2) * (height - 2));

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let lap = gray[(y - 1) * width + x] as i32
                + gray[y * width + (x - 1)] as i32
                + gray[y * width + (x + 1)] as i32
                + gray[(y + 1) * width + x] as i32
                - 4 * gray[y * width + x] as i32;
            responses.push(lap as f32);
        }
    }

    let n = responses.len() as f32;
    let mean = responses.iter().sum::<f32>() / n;
    let variance = responses.iter().map(|&v| (v - mean) * (v - mean)).sum::<f32>() / n;

    variance
}

// Convert the frame to grayscale
fn to_grayscale(frame_data: &mut [u8]) -> Vec<u8> {
    let mut gray_frame = Vec::with_capacity(frame_data.len() / 4);
    for i in (0..frame_data.len()).step_by(4) {
        let r = frame_data[i] as u16;
        let g = frame_data[i + 1] as u16;
        let b = frame_data[i + 2] as u16;
        let gray = ((r + g + b) / 3) as u8;
        gray_frame.push(gray);
    }
    gray_frame
}

