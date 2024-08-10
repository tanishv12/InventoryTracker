'use client';
import { useState, useEffect, useRef } from "react";
import { Camera } from "react-camera-pro";
import { firestore, storage, model } from '@/firebase';
import {
  Box, Modal, Stack, Button, TextField, Typography, Card, CardContent, CardActions, Grid, Container, Fab, Divider, ThemeProvider, createTheme, ButtonBase, IconButton, InputBase
} from "@mui/material";
import { Add as AddIcon, CameraAlt as CameraIcon, Remove as RemoveIcon, Kitchen as KitchenIcon, Inventory as InventoryIcon, Search as SearchIcon, RestaurantMenu as RestaurantMenuIcon, MenuBook as MenuBookIcon } from '@mui/icons-material';
import ImageIcon from '@mui/icons-material/Image';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const defaultImageUrl = 'https://coolbackgrounds.io/images/backgrounds/white/white-trianglify-b79c7e1f.jpg';

const customTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#000000', // Black
      },
      secondary: {
        main: '#B0B0B0', // Dark gray
      },
      background: {
        default: '#121212', // Very dark gray
        paper: '#B0B0B0', // Dark gray for cards and papers
      },
      text: {
        primary: '#000000', // White text
        secondary: '#424242', // Light gray text
      },
    },
  });



export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [update, setUpdate] = useState(false);
  const camera = useRef(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [updatedName, setUpdatedName] = useState('');
  const [updatedQuantity, setUpdatedQuantity] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemImage, setItemImage] = useState(null);
  const [activeScreen, setActiveScreen] = useState('pantry'); // 'pantry' or 'recipes'
  const [recipes, setRecipes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const longPressTimerRef = useRef(null);

  const updateInventory = async () => {
    const snapshot = await getDocs(collection(firestore, 'inventory'));
    const inventoryList = [];
    snapshot.forEach((doc) => {
      inventoryList.push({
        name: doc.id,
        ...doc.data(),
      });
    });
    setInventory(inventoryList);
  };

  useEffect(() => {
    updateInventory();
  }, []);

  const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);

  const removeItem = async (item) => {
    const docRef = doc(firestore, 'inventory', item);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      if (quantity === 1) {
        await deleteDoc(docRef);
      } else {
        await updateDoc(docRef, { quantity: quantity - 1 });
      }
    }
    await updateInventory();
  };

  const handleMouseDown = (item) => {
    longPressTimerRef.current = setTimeout(() => {
      handleLongPress(item);
    }, 1000);
  };

  const handleMouseUp = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const handleMouseLeave = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const handleLongPress = (item) => {
    handleUpdateOpen(item);
  };

  const addItem = async (item, image) => {
    const capitalizedItem = capitalizeFirstLetter(item);
    let imageUrl = defaultImageUrl;

    if (image) {
      const storageRef = ref(storage, `pantry-items/${image.name}`);
      await uploadBytes(storageRef, image);
      imageUrl = await getDownloadURL(storageRef);
    }
    
    const docRef = doc(firestore, 'inventory', capitalizedItem);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity, imageUrl: existingImageUrl } = docSnap.data();
      await setDoc(docRef, { name: capitalizedItem, quantity: quantity + 1, imageUrl: image ? imageUrl : existingImageUrl });
    } else {
      await setDoc(docRef, { name: capitalizedItem, quantity: 1, imageUrl });
    }
    await updateInventory();
  };

  const updateItem = async () => {
    if (!currentItem) return;

    const docRef = doc(firestore, 'inventory', currentItem.name);
    let imageUrl = currentItem.imageUrl || defaultImageUrl;

    if (itemImage) {
      const storageRef = ref(storage, `pantry-items/${itemImage.name}`);
      await uploadBytes(storageRef, itemImage);
      imageUrl = await getDownloadURL(storageRef);
    }

    await updateDoc(docRef, { name: updatedName, quantity: parseInt(updatedQuantity), imageUrl });

    if (currentItem.name !== updatedName) {
      const newDocRef = doc(firestore, 'inventory', updatedName);
      await setDoc(newDocRef, { name: updatedName, quantity: parseInt(updatedQuantity), imageUrl });
      await deleteDoc(docRef);
    }

    setCurrentItem(null);
    setUpdatedName('');
    setUpdatedQuantity('');
    setItemImage(null);
    setUpdate(false);
    await updateInventory();
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleUpdateOpen = (item) => {
    setCurrentItem(item);
    setUpdatedName(item.name);
    setUpdatedQuantity(item.quantity.toString());
    setItemImage(null);
    setUpdate(true);
  };
  const handleCloseUpdate = () => setUpdate(false);

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateRecipes = async () => {
    const foodItems = inventory.map(item => item.name).join(", ");
    const prompt = `Generate a few recipes using these ingredients: ${foodItems}. Make it very concise with instructions.`;

    try {
      const result = await model.generateContentStream([{ text: prompt }]);

      let generatedRecipe = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        generatedRecipe += chunkText;
      }

      setRecipes(generatedRecipe.trim());
    } catch (error) {
      console.error("Error generating content: ", error);
    }
  };

  const handleCamClick = () => {
    setCameraOpen(true);
  };

  

  const fileToGenerativePart = async (file) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  const handleFileUpload = async () => {
    if (!itemImage) return;

    const prompt = "Identify the item in the picture with one word without a period.";
    const imageParts = await fileToGenerativePart(itemImage);

    try {
      const result = await model.generateContentStream([prompt, imageParts]);

      let identifiedItem = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        identifiedItem += chunkText;
      }

      setItemName(identifiedItem.trim());
    } catch (error) {
      console.error("Error generating content: ", error);
    }
  };

  const takePhoto = () => {
    const photo = camera.current.takePhoto();
    const photoFile = dataURLtoFile(photo, 'photo.jpg');
    setItemImage(photoFile);  // Set the image state
    handleFileUpload(photoFile);  // Classify the image directly
    setCameraOpen(false);
  };

  const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  };

  return (
    <ThemeProvider theme={customTheme}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Heading with Navigation Buttons */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Inventory Tracker
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <ButtonBase onClick={() => setActiveScreen('pantry')} sx={{ display: 'flex', alignItems: 'center' }}>
              <RestaurantMenuIcon sx={{ mr: 1 }} />
              <Typography>Pantry Items</Typography>
            </ButtonBase>
            <ButtonBase onClick={() => { setActiveScreen('recipes'); generateRecipes(); }} sx={{ display: 'flex', alignItems: 'center' }}>
              <MenuBookIcon sx={{ mr: 1 }} />
              <Typography>Generate Recipes</Typography>
            </ButtonBase>
            {searchOpen && (
              <InputBase
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  transition: 'width 0.3s ease',
                  width: searchOpen ? '300px' : '0px',
                  opacity: searchOpen ? 1 : 0,
                  mr: 2,
                }}
              />
            )}
            <IconButton onClick={() => setSearchOpen(!searchOpen)}>
              <SearchIcon sx={{ color:"black", mr: 1 }}/>
            </IconButton>
          </Box>
        </Box>

        {/* Conditional Rendering of Screens */}
        {activeScreen === 'pantry' && (
  <>
    <Box width="100%" height="auto" overflow="auto" padding={2} sx={{ borderRadius: '16px', backgroundColor: '#f9f9f9' }}>
      <Grid container spacing={4}>
        {filteredInventory.length === 0 ? (
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ textAlign: 'center', marginTop: '20px', color: 'gray' }}>
              No items in inventory <Button
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpen}
            >
            </Button>
            </Typography>
          </Grid>
        ) : (
          filteredInventory.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.name}>
              <Card
                sx={{
                  borderRadius: '12px',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                  backgroundColor: '#FFFFFF',
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.03)',
                  },
                }}
                onMouseDown={() => handleMouseDown(item)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  src={item.imageUrl || defaultImageUrl}
                  alt={item.name}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '12px 12px 0 0',
                  }}
                />
                <CardContent sx={{ padding: '16px', backgroundColor: '#fafafa' }}>
                  <Typography variant="h6" component="div" sx={{ marginBottom: '8px', fontWeight: 'bold', textAlign: 'center' }}>
                    {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', marginBottom: '16px' }}>
                    Quantity: {item.quantity}
                  </Typography>
                  <CardActions sx={{ justifyContent: 'space-around' }}>
                    <IconButton onClick={() => addItem(item.name)} sx={{ color: 'primary.main' }}>
                      <AddIcon />
                    </IconButton>
                    <IconButton onClick={() => removeItem(item.name)} sx={{ color: 'primary.main' }}>
                      <RemoveIcon />
                    </IconButton>
                  </CardActions>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>


            <Fab
              color="primary"
              aria-label="add"
              onClick={handleOpen}
              sx={{ position: 'fixed', bottom: 16, right: 40 }}
            >
              <AddIcon />
            </Fab>
          </>
        )}

        {activeScreen === 'recipes' && (
          <Box padding={2} sx={{ borderRadius: '16px' }}>
            <Typography variant="h5" sx={{ textAlign: 'center', marginBottom: "20px", fontWeight:'bold' }}>Generated Recipes</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1">{recipes}</Typography>
          </Box>
        )}

        {/* Modals for Adding/Updating Items */}
        <Modal open={cameraOpen} onClose={() => setCameraOpen(false)}>
          <Box
            position="absolute"
            top="50%"
            left="50%"
            width={800}
            height={500}
            bgcolor="white"
            border="2px solid black"
            boxShadow={24}
            p={4}
            display="flex"
            flexDirection="column"
            gap={3}
            sx={{
              transform: "translate(-50%, -50%)",
              borderRadius: '16px',
            }}
          >
            <Camera ref={camera} />
            <Button onClick={takePhoto} variant="contained">Take photo</Button>
          </Box>
        </Modal>

        <Modal open={open} onClose={handleClose}>
          <Box
            position="absolute"
            top="50%"
            left="50%"
            width={550}
            bgcolor="white"
            border="2px solid black"
            boxShadow={24}
            p={4}
            display="flex"
            flexDirection="column"
            gap={3}
            sx={{
              transform: "translate(-50%, -50%)",
              borderRadius: '16px',
            }}
          >
            <Typography variant="h6">Add item</Typography>
            <Stack width="100%" direction="column" spacing={2}>
              <TextField
                variant='outlined'
                fullWidth
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                label="Item Name"
              />
              <Box display="flex" gap={1} alignItems="center" justifyContent="space-between">
              <IconButton 
                color="primary" 
                component="label"  // Makes the IconButton act as a label for the input
                sx={{ flex: 1 }}
              >
                <ImageIcon />
                <input 
                  type="file" 
                  onChange={(e) => setItemImage(e.target.files[0])} 
                  hidden  // Hide the file input
                />
              </IconButton>
                <IconButton 
                  color="primary" 
                  onClick={handleCamClick}
                  sx={{ flex: 1 }}
                >
                  <CameraIcon />
                </IconButton>
                <ButtonBase
                  variant="contained" 
                  size="small" 
                  sx={{ padding: '5px 10px', fontSize: '10px', flex: 1 }}
                  onClick={handleFileUpload}
                >
                  <img 
                    src="/geminiLogo.png" 
                    style={{ width: '24px', height: '24px' }}
                  />
                </ButtonBase>
              </Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  addItem(itemName, itemImage);
                  setItemName('');
                  setItemImage(null);
                  handleClose();
                }}
              >
                Add Item
              </Button>
            </Stack>
          </Box>
        </Modal>

        <Modal open={update} onClose={handleCloseUpdate}>
          <Box
            position="absolute"
            top="50%"
            left="50%"
            width={550}
            bgcolor="white"
            border="2px solid black"
            boxShadow={24}
            p={4}
            display="flex"
            flexDirection="column"
            gap={3}
            sx={{
              transform: "translate(-50%, -50%)",
              borderRadius: '16px',
            }}
          >
            <Typography variant="h6">Update Item</Typography>
            <Stack width="100%" direction="column" spacing={2}>
              <TextField
                variant='outlined'
                fullWidth
                value={updatedName}
                onChange={(e) => setUpdatedName(e.target.value)}
                label="Item Name"
              />
              <TextField
                variant='outlined'
                fullWidth
                value={updatedQuantity}
                onChange={(e) => setUpdatedQuantity(e.target.value)}
                label="Quantity"
                type="number"
              />
              <input type="file" onChange={(e) => setItemImage(e.target.files[0])} />
              <Button
                variant="outlined"
                onClick={updateItem}
              >
                Save
              </Button>
            </Stack>
          </Box>
        </Modal>
      </Container>
    </ThemeProvider>
  );
}

function RecipeCard({ title, details }) {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <Card sx={{ maxWidth: 345, marginBottom: 2 }}>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {expanded ? details : details.substring(0, 100) + '...'}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={handleExpandClick}>
          {expanded ? "Show Less" : "Show More"}
        </Button>
      </CardActions>
    </Card>
  );
}