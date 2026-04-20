# 🤖 AI Models

This directory documents the AI models used in EmotionAI.

---

## Browser-Side Models (face-api.js)

These weights are loaded automatically from jsDelivr CDN at runtime.

### TinyFaceDetector
- **Source:** vladmandic/face-api
- **CDN URL:** `https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model`
- **Size:** ~190KB
- **Architecture:** Tiny YOLO-based single-shot detector
- **Purpose:** Real-time face localization
- **Speed:** ~5ms per frame on modern hardware

### FaceExpressionNet
- **Source:** face-api.js / justadudewhohacks
- **Size:** ~310KB
- **Architecture:** Custom CNN trained on FER2013 + AffectNet
- **Classes:** neutral, happy, sad, angry, fearful, disgusted, surprised
- **Accuracy:** ~82% on FER2013 test set
- **Speed:** ~20ms per frame

---

## Python Backend Models (DeepFace)

These models are downloaded by DeepFace automatically on first use.

### DeepFace Emotion Model (VGG-Face based)
- **Size:** ~580MB (downloaded to `~/.deepface/weights/`)
- **Dataset:** FER2013 (35,887 labeled grayscale images, 48×48px)
- **Classes:** angry, disgust, fear, happy, sad, surprise, neutral
- **Accuracy:** ~88% on FER2013 test set
- **Backend options:** `opencv` (fastest), `ssd_mobilenet`, `mtcnn` (most accurate)

### Alternative: FER Library
```bash
pip install fer
```
Uses MTCNN for detection + a lighter CNN for classification. ~85% accuracy, ~60ms latency.

---

## FER2013 Dataset

The FER2013 dataset contains 35,887 grayscale 48×48 pixel face images labeled with one of 7 emotions. Originally published for the ICML 2013 Representation Learning Workshop.

- Training: 28,709 examples
- Validation: 3,589 examples
- Test: 3,589 examples

---

## Improving Accuracy

To improve accuracy beyond the default models:

1. **Use MTCNN** as the face detector (slower but more accurate):
   ```python
   DeepFace.analyze(img, detector_backend="mtcnn")
   ```

2. **Fine-tune on your own data** using transfer learning on top of the DeepFace emotion model.

3. **Ensemble multiple models** — average predictions from DeepFace and FER for more robust results.

4. **Add landmark alignment** — aligning faces to a canonical pose before classification significantly improves accuracy.

---

## Custom Model Integration

To use a custom TensorFlow/Keras model:

```python
# In backend/main.py
import tensorflow as tf
custom_model = tf.keras.models.load_model('models/my_emotion_model.h5')

def detect_with_custom(img):
    face_img = preprocess_face(img)  # resize to 48x48, normalize
    preds = custom_model.predict(face_img[np.newaxis])[0]
    return dict(zip(EMOTION_KEYS, preds.tolist()))
```
