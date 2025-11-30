import { Router } from 'express';
import { authenticateWithGoogle } from '../services/authService';

const router = Router();

router.post('/google/callback', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ message: 'idToken is required' });
    }

    const result = await authenticateWithGoogle(idToken);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

export default router;
