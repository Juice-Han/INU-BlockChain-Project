import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  createClub,
  getClubDetails,
  joinClub,
  payClubFee
} from '../services/clubService';
import { validateClubName, validateEthAmount } from '../utils/validation';

const router = Router();

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name } = req.body;

    const validation = validateClubName(name);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const userId = req.user!.id;
    const result = await createClub(userId, name.trim());
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/:clubId/join', authMiddleware, async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);
    if (Number.isNaN(clubId)) {
      return res.status(400).json({ message: 'Invalid club id' });
    }

    const result = await joinClub(req.user!.id, clubId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/:clubId/pay', authMiddleware, async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);
    const amountRaw = req.body.amount;

    if (Number.isNaN(clubId)) {
      return res.status(400).json({ message: 'Invalid club id' });
    }

    const amount = String(amountRaw);
    const validation = validateEthAmount(amount);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const result = await payClubFee(req.user!.id, clubId, amount);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.get('/:clubId', async (req, res, next) => {
  try {
    const clubId = Number(req.params.clubId);
    if (Number.isNaN(clubId)) {
      return res.status(400).json({ message: 'Invalid club id' });
    }

    const result = await getClubDetails(clubId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

export default router;
