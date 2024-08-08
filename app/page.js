'use client'
import { useState, useEffect, useRef } from "react";
import { firestore, storage } from '@/firebase';
import { Box, Modal, Stack, Button, TextField, Typography, Card, CardContent, CardActions, Grid } from "@mui/material";
import { collection, query, getDocs, setDoc, doc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const defaultImageUrl = 'https://coolbackgrounds.io/images/backgrounds/white/white-trianglify-b79c7e1f.jpg';

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [update, setUpdate] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [updatedName, setUpdatedName] = useState('');
  const [updatedQuantity, setUpdatedQuantity] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemImage, setItemImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

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

    // Update the existing document
    await updateDoc(docRef, { name: updatedName, quantity: parseInt(updatedQuantity), imageUrl });

    // If the name has changed, create a new document with the updated name and delete the old one
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
    setItemImage(null); // Clear previous image
    setUpdate(true);
  };
  const handleCloseUpdate = () => setUpdate(false);

  useEffect(() => {
    updateInventory();
  }, []);

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLongPress = (item) => {
    console.log("Long Press detected on:", item.name);
    handleUpdateOpen(item);
  };

  const handleMouseDown = (item) => {
    console.log("Mouse Down on:", item.name);
    longPressTimerRef.current = setTimeout(() => {
      handleLongPress(item);
    }, 1000); // 1 second for long press
  };

  const handleMouseUp = () => {
    console.log("Mouse Up");
    clearTimeout(longPressTimerRef.current);
  };

  const handleMouseLeave = () => {
    console.log("Mouse Leave");
    clearTimeout(longPressTimerRef.current);
  };

  return (
    <Box width="100vw" height="100vh" display="flex" justifyContent="center" alignItems="center" flexDirection="column" gap={2}>
      <Modal open={open} onClose={handleClose}>
        <Box
          position="absolute"
          top="50%"
          left="50%"
          width={400}
          bgcolor="white"
          border="2px solid black"
          boxShadow={24}
          p={4}
          display="flex"
          flexDirection="column"
          gap={3}
          sx={{
            transform: "translate(-50%, -50%)",
            borderRadius: '16px',  // Rounded edges for the modal
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
            <input type="file" onChange={(e) => setItemImage(e.target.files[0])} />
            <Button
              variant="contained"
              onClick={() => {
                addItem(itemName, itemImage); // Pass itemImage correctly
                setItemName('');
                setItemImage(null);
                handleClose();
              }}
            >
              Add
            </Button>
          </Stack>
        </Box>
      </Modal>

      <Modal open={update} onClose={handleCloseUpdate}>
        <Box
          position="absolute"
          top="50%"
          left="50%"
          width={400}
          bgcolor="white"
          border="2px solid black"
          boxShadow={24}
          p={4}
          display="flex"
          flexDirection="column"
          gap={3}
          sx={{
            transform: "translate(-50%, -50%)",
            borderRadius: '16px',  // Rounded edges for the modal
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
              variant="contained"
              onClick={updateItem}
            >
              Save
            </Button>
          </Stack>
        </Box>
      </Modal>

      <Box border="1px solid black" width="800px" sx={{ borderRadius: '16px' }}>
        <Box
          width="100%"
          height="100px"
          bgcolor="grey"
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ borderRadius: '16px 16px 0 0' }}
        >
          <Typography variant="h3">Inventory Items</Typography>
        </Box>
        <Box width="100%" height="550px" overflow="auto" padding={2}>
          <Grid container spacing={2}>
            {filteredInventory.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.name}>
                <Card
                  sx={{ borderRadius: '16px' }}
                  onMouseDown={() => handleMouseDown(item)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  <img
                    src={item.imageUrl || defaultImageUrl}
                    alt={item.name}
                    style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '16px 16px 0 0' }}
                  />
                  <CardContent>
                    <Typography variant="h5" component="div">
                      {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      Quantity: {item.quantity}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button variant="contained" onClick={() => addItem(item.name)}>
                      Add
                    </Button>
                    <Button variant="contained" onClick={() => removeItem(item.name)}>
                      Remove
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      <Box width="800px" display="flex" justifyContent="space-between" alignItems="center" flexDirection="row" gap={2}>
        <TextField 
          variant='outlined'
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1 }} // Use flex to make the search bar take most of the space
        />
        <Button variant="contained" onClick={handleOpen} sx={{ flexShrink: 0 }}>Add New Item</Button>
      </Box>
    </Box>
  );
}
