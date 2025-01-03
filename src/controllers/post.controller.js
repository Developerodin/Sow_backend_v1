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

const updatePostStatus = async (req, res) => {
  try {
    const { postId, status, postTo } = req.body; // Extract new status and postTo from request body

    // Validate the status value against allowed statuses
    const allowedStatuses = ['New', 'Pending', 'Rejected', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid post status.' });
    }

    // Prepare the update object
    const update = { postStatus: status };
    if (status === 'Pending' && postTo) {
      update.postTo = postTo;
    }

    // Find the post by ID and update the status
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $set: update },
      { new: true } // Return the updated document
    );

    if (!updatedPost) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Error updating post status:', error);
    res.status(500).json({ message: error.message });
  }
};

const filterPostsByUserId = async (req, res) => {
  try {
    const { b2cUserId } = req.body; // Extract b2cUserId from request body

    // Define the query to filter posts by user ID and specific statuses
    const query = {
      postBy: b2cUserId,
      postStatus: { $in: ['Pending', 'Rejected', 'Completed'] },
    };

    // Fetch the filtered posts and populate necessary fields
    const posts = await Post.find(query)
      .populate('postBy', 'firstName lastName')
      .populate('postTo', 'name registerAs');

    if (!posts.length) {
      return res.status(404).json({ message: 'No posts found for this user with the specified statuses.' });
    }

    res.status(200).json(posts);
  } catch (error) {
    console.error('Error filtering posts:', error);
    res.status(500).json({ message: error.message });
  }
};

const verifyOtpAndCompletePost = async (req, res) => {
  try {
    const { postId, otp } = req.body;

    if (!postId || !otp) {
      return res.status(400).json({ message: 'Post ID and OTP are required.' });
    }

    // Find the post by ID
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Check if the provided OTP matches the post's OTP
    if (post.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // Update the post status to 'Completed'
    post.postStatus = 'Completed';
    await post.save();

    res.status(200).json(post);
  } catch (error) {
    console.error('Error verifying OTP and completing post:', error);
    res.status(500).json({ message: error.message });
  }
};



export { createPost, getAllPosts, getPostById, updatePost, deletePost, updatePostStatus, filterPostsByUserId, verifyOtpAndCompletePost };