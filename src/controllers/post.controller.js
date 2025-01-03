import Post from "../models/post.modal.js";

const createPost = async (req, res) => {
  try {
    // Destructure the incoming request body
    const {
      postBy,
      postTo,
      categoryName,
      subCategoryName,
      images,
      title,
      description,
      price,
      quantity,
      companyName,
      emailAddress,
      phoneNumber,
      state,
      city,
      address,
      postStatus,
    } = req.body;

    // Log the incoming request body for debugging
    console.log('Request body:', req.body);
    const otp = Math.floor(1000 + Math.random() * 9000);

    // Create a new post instance
    const post = new Post({
      postBy,
      postTo,
      categoryName,
      subCategoryName,
      images,
      title,
      description,
      price,
      quantity,
      companyName,
      emailAddress,
      phoneNumber,
      state,
      city,
      address,
      postStatus,
      otp,
    });

    // Save the post to the database
    const savedPost = await post.save();
    res.status(201).json(savedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      message: 'An error occurred while creating the post.',
      error: error.message,
    });
  }
};

// Get all Posts
const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('postBy', 'firstName lastName')
      .populate('postTo', 'name registerAs');
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single Post by ID
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('postBy', 'firstName lastName')
      .populate('postTo', 'name registerAs');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a Post
const updatePost = async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPost) return res.status(404).json({ message: 'Post not found' });
    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a Post
const deletePost = async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ message: 'Post not found' });
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { createPost, getAllPosts, getPostById, updatePost, deletePost };