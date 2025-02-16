import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Toaster, toast } from 'react-hot-toast';
import { MapPin, Hospital, LogOut, Clock, Phone, Star, ChevronRight, X, Navigation } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };
const defaultLocation = { lat: 28.6139, lng: 77.2090 };
const libraries = ["places"];

function App() {
  const [user, setUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [map, setMap] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hospitalDetails, setHospitalDetails] = useState(null);
  const [directions, setDirections] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLocation(defaultLocation);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocation(userLocation);
        if (map) searchNearbyHospitals(userLocation, map);
        toast.success('Location found!');
      },
      (error) => {
        setLocationError('Unable to fetch location. Please enable location services.');
        toast.error('Location access denied.');
        setLocation(defaultLocation);
      }
    );
  };

  useEffect(() => {
    if (user) requestLocation();
  }, [user, map]);

  const searchNearbyHospitals = (location, map) => {
    if (!map) return;

    const service = new window.google.maps.places.PlacesService(map);
    const request = { location, radius: 5000, type: 'hospital' };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setHospitals(results);
        toast.success(`Found ${results.length} hospitals nearby`);
      } else {
        toast.error('Error finding hospitals');
      }
    });
  };

  const getHospitalDetails = (placeId) => {
    if (!map) return;

    setIsLoadingDetails(true);
    const service = new window.google.maps.places.PlacesService(map);
    service.getDetails(
      {
        placeId,
        fields: ['name', 'formatted_phone_number', 'opening_hours', 'rating', 'photos', 'formatted_address', 'website']
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setHospitalDetails(place);
        } else {
          toast.error('Error fetching hospital details');
        }
        setIsLoadingDetails(false);
      }
    );
  };

  const handleHospitalSelect = (hospital) => {
    setSelectedHospital(hospital);
    getHospitalDetails(hospital.place_id);
  };

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Successfully signed in!');
    } catch {
      toast.error('Error signing in');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setLocation(null);
    setHospitals([]);
    setSelectedHospital(null);
    setHospitalDetails(null);
    setDirections(null);
    toast.success('Successfully signed out!');
  };

  const onLoad = useCallback((map) => setMap(map), []);
  const onUnmount = useCallback(() => setMap(null), []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      <header className="p-4 bg-blue-600 text-white text-center text-xl font-bold flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Navigation size={24} /> <span>Hospital Finder</span>
        </div>
        {user && (
          <button onClick={handleSignOut} className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center gap-2">
            <LogOut size={18} /> Logout
          </button>
        )}
      </header>

      {!user ? (
        <div className="h-screen flex flex-col items-center justify-center">
          <h1 className="text-2xl font-semibold mb-4">Welcome to Hospital Finder</h1>
          <button onClick={handleSignIn} className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-all">
            Sign in with Google
          </button>
        </div>
      ) : (
        <div className="h-screen flex">
          <aside className="w-1/3 bg-white p-6 border-r overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Nearby Hospitals</h2>
            {hospitals.length === 0 ? (
              <p className="text-gray-500">No hospitals found nearby.</p>
            ) : (
              hospitals.map((hospital) => (
                <div key={hospital.place_id} className="p-4 border-b cursor-pointer hover:bg-gray-100 rounded-lg transition-all" onClick={() => handleHospitalSelect(hospital)}>
                  <h3 className="font-semibold">{hospital.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <MapPin size={14} /> {hospital.vicinity}
                  </p>
                </div>
              ))
            )}
          </aside>

          <main className="flex-1 relative">
            <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY} libraries={libraries}>
              <GoogleMap mapContainerStyle={containerStyle} center={location || defaultLocation} zoom={14} onLoad={onLoad} onUnmount={onUnmount}>
                <Marker position={location || defaultLocation} />
                {hospitals.map((hospital) => (
                  <Marker key={hospital.place_id} position={hospital.geometry.location} title={hospital.name} onClick={() => handleHospitalSelect(hospital)} />
                ))}
              </GoogleMap>
            </LoadScript>
          </main>
        </div>
      )}
    </div>
  );git init

}

export default App;
