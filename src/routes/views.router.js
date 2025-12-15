import express from 'express';

const viewsRouter = express.Router();

viewsRouter.get('/', (req, res) => {
    res.render("home"); // Render the 'home' view
});

export default viewsRouter;