import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LineChart } from 'react-native-gifted-charts';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  date: string;
}

interface Exercise {
  id: string;
  name: string;
  details: string;
  video_url?: string;
  is_custom: boolean;
}

interface WorkoutLog {
  id: string;
  exercise_name: string;
  exercise_details: string;
  date: string;
}

interface Weight {
  id: string;
  weight: number;
  notes?: string;
  date: string;
}

interface ProgressPhoto {
  id: string;
  image_base64: string;
  notes?: string;
  date: string;
}

interface DailyStats {
  total_calories: number;
  total_protein: number;
  meals_count: number;
  workouts_count: number;
  date: string;
}

const CALORIE_TARGET = 1600;
const PROTEIN_TARGET = 110;

const DEFAULT_EXERCISES: Omit<Exercise, 'id'>[] = [
  { name: 'Hip Thrust', details: '4x10', video_url: 'https://www.youtube.com/embed/LM8XHLYJoYs', is_custom: false },
  { name: 'Presse à cuisses', details: '4x10', video_url: 'https://www.youtube.com/embed/IZxyjW7MPJQ', is_custom: false },
  { name: 'Rowing', details: '4x10', video_url: 'https://www.youtube.com/embed/GZbfZ033f74', is_custom: false },
  { name: 'Lat Pulldown', details: '3x10', video_url: 'https://www.youtube.com/embed/CAwf7n6Luuc', is_custom: false },
];

export default function FitnessApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'nutrition' | 'sport' | 'progress'>('home');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [todayWorkouts, setTodayWorkouts] = useState<WorkoutLog[]>([]);
  const [weights, setWeights] = useState<Weight[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);

  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealProtein, setMealProtein] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [weightNotes, setWeightNotes] = useState('');
  const [photoNotes, setPhotoNotes] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseDetails, setNewExerciseDetails] = useState('');

  const [addExerciseModal, setAddExerciseModal] = useState(false);
  const [photoViewerModal, setPhotoViewerModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, mealsRes, workoutsRes, weightsRes, photosRes, exercisesRes] = await Promise.all([
        fetch(`${API_URL}/api/stats/daily`),
        fetch(`${API_URL}/api/meals/today`),
        fetch(`${API_URL}/api/workouts/today`),
        fetch(`${API_URL}/api/weights?limit=30`),
        fetch(`${API_URL}/api/photos?limit=50`),
        fetch(`${API_URL}/api/exercises`),
      ]);

      if (statsRes.ok) setDailyStats(await statsRes.json());
      if (mealsRes.ok) setTodayMeals(await mealsRes.json());
      if (workoutsRes.ok) setTodayWorkouts(await workoutsRes.json());
      if (weightsRes.ok) setWeights(await weightsRes.json());
      if (photosRes.ok) setPhotos(await photosRes.json());
      if (exercisesRes.ok) setCustomExercises(await exercisesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const addMeal = async () => {
    if (!mealName || !mealCalories || !mealProtein) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mealName,
          calories: parseFloat(mealCalories),
          protein: parseFloat(mealProtein),
        }),
      });
      if (response.ok) {
        setMealName('');
        setMealCalories('');
        setMealProtein('');
        fetchData();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le repas');
    }
  };

  const deleteMeal = async (mealId: string) => {
    try {
      await fetch(`${API_URL}/api/meals/${mealId}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer le repas');
    }
  };

  const logWorkout = async (exerciseName: string, exerciseDetails: string) => {
    try {
      const response = await fetch(`${API_URL}/api/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_name: exerciseName,
          exercise_details: exerciseDetails,
        }),
      });
      if (response.ok) {
        fetchData();
        Alert.alert('Bravo!', `${exerciseName} complété!`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'exercice');
    }
  };

  const addWeight = async () => {
    if (!weightInput) {
      Alert.alert('Erreur', 'Veuillez entrer votre poids');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/weights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: parseFloat(weightInput),
          notes: weightNotes || null,
        }),
      });
      if (response.ok) {
        setWeightInput('');
        setWeightNotes('');
        fetchData();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le poids');
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'Accès à la galerie nécessaire');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      try {
        const response = await fetch(`${API_URL}/api/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: `data:image/jpeg;base64,${result.assets[0].base64}`,
            notes: photoNotes || null,
          }),
        });
        if (response.ok) {
          setPhotoNotes('');
          fetchData();
          Alert.alert('Succès', 'Photo ajoutée!');
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible d\'ajouter la photo');
      }
    }
  };

  const addCustomExercise = async () => {
    if (!newExerciseName || !newExerciseDetails) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExerciseName,
          details: newExerciseDetails,
          is_custom: true,
        }),
      });
      if (response.ok) {
        setNewExerciseName('');
        setNewExerciseDetails('');
        setAddExerciseModal(false);
        fetchData();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'exercice');
    }
  };

  const caloriesProgress = dailyStats ? Math.min((dailyStats.total_calories / CALORIE_TARGET) * 100, 100) : 0;
  const proteinProgress = dailyStats ? Math.min((dailyStats.total_protein / PROTEIN_TARGET) * 100, 100) : 0;

  const chartData = weights.slice().reverse().map((w, index) => ({
    value: w.weight,
    label: index % 5 === 0 ? w.date.slice(5) : '',
    dataPointText: w.weight.toString(),
  }));

  const allExercises = [...DEFAULT_EXERCISES.map((ex, i) => ({ ...ex, id: `default-${i}` })), ...customExercises];

  const renderHomeTab = () => (
    <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
      <Text style={styles.greeting}>Bonjour! 💪</Text>
      <Text style={styles.dateText}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="flame" size={24} color="#FF6B6B" />
          <Text style={styles.cardTitle}>Calories</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${caloriesProgress}%`, backgroundColor: '#FF6B6B' }]} />
          </View>
          <Text style={styles.progressText}>{dailyStats?.total_calories.toFixed(0) || 0} / {CALORIE_TARGET} kcal</Text>
        </View>
        <Text style={styles.remainingText}>Restant: {Math.max(CALORIE_TARGET - (dailyStats?.total_calories || 0), 0).toFixed(0)} kcal</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="nutrition" size={24} color="#4ECDC4" />
          <Text style={styles.cardTitle}>Protéines</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${proteinProgress}%`, backgroundColor: '#4ECDC4' }]} />
          </View>
          <Text style={styles.progressText}>{dailyStats?.total_protein.toFixed(0) || 0} / {PROTEIN_TARGET} g</Text>
        </View>
        <Text style={styles.remainingText}>Restant: {Math.max(PROTEIN_TARGET - (dailyStats?.total_protein || 0), 0).toFixed(0)} g</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="today" size={24} color="#A78BFA" />
          <Text style={styles.cardTitle}>Résumé du jour</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{dailyStats?.meals_count || 0}</Text>
            <Text style={styles.summaryLabel}>Repas</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{dailyStats?.workouts_count || 0}</Text>
            <Text style={styles.summaryLabel}>Exercices</Text>
          </View>
        </View>
      </View>
      {todayWorkouts.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.cardTitle}>Exercices complétés</Text>
          </View>
          {todayWorkouts.map((workout) => (
            <View key={workout.id} style={styles.workoutItem}>
              <Text style={styles.workoutName}>{workout.exercise_name}</Text>
              <Text style={styles.workoutDetails}>{workout.exercise_details}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderNutritionTab = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
        <Text style={styles.sectionTitle}>Ajouter un repas</Text>
        <View style={styles.inputCard}>
          <TextInput style={styles.input} placeholder="Nom du repas" placeholderTextColor="#666" value={mealName} onChangeText={setMealName} />
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, styles.inputHalf]} placeholder="Calories" placeholderTextColor="#666" keyboardType="numeric" value={mealCalories} onChangeText={setMealCalories} />
            <TextInput style={[styles.input, styles.inputHalf]} placeholder="Protéines (g)" placeholderTextColor="#666" keyboardType="numeric" value={mealProtein} onChangeText={setMealProtein} />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addMeal}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Ajouter</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Repas du jour</Text>
        {todayMeals.length === 0 ? (
          <Text style={styles.emptyText}>Aucun repas enregistré aujourd'hui</Text>
        ) : (
          todayMeals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealDetails}>{meal.calories} kcal • {meal.protein}g protéines</Text>
              </View>
              <TouchableOpacity onPress={() => deleteMeal(meal.id)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderSportTab = () => (
    <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Exercices</Text>
        <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setAddExerciseModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      {allExercises.map((exercise) => {
        const isCompleted = todayWorkouts.some((w) => w.exercise_name === exercise.name);
        return (
          <View key={exercise.id} style={[styles.exerciseCard, isCompleted && styles.exerciseCompleted]}>
            <View style={styles.exerciseHeader}>
              <View>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseDetails}>{exercise.details}</Text>
                {exercise.is_custom && <Text style={styles.customBadge}>Personnalisé</Text>}
              </View>
              <TouchableOpacity style={[styles.completeButton, isCompleted && styles.completedButton]} onPress={() => !isCompleted && logWorkout(exercise.name, exercise.details)} disabled={isCompleted}>
                <Ionicons name={isCompleted ? 'checkmark' : 'checkmark-circle-outline'} size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <Modal visible={addExerciseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvel exercice</Text>
            <TextInput style={styles.input} placeholder="Nom de l'exercice" placeholderTextColor="#666" value={newExerciseName} onChangeText={setNewExerciseName} />
            <TextInput style={styles.input} placeholder="Détails (ex: 3x12)" placeholderTextColor="#666" value={newExerciseDetails} onChangeText={setNewExerciseDetails} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setAddExerciseModal(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={addCustomExercise}>
                <Text style={styles.confirmButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  const renderProgressTab = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
        <Text style={styles.sectionTitle}>Suivi du poids</Text>
        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, styles.inputHalf]} placeholder="Poids (kg)" placeholderTextColor="#666" keyboardType="numeric" value={weightInput} onChangeText={setWeightInput} />
            <TextInput style={[styles.input, styles.inputHalf]} placeholder="Notes (optionnel)" placeholderTextColor="#666" value={weightNotes} onChangeText={setWeightNotes} />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addWeight}>
            <Ionicons name="scale-outline" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
        {chartData.length > 1 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Évolution du poids</Text>
            <LineChart data={chartData} width={Dimensions.get('window').width - 80} height={200} spacing={40} color="#A78BFA" thickness={3} startFillColor="rgba(167, 139, 250, 0.3)" endFillColor="rgba(167, 139, 250, 0.01)" initialSpacing={10} endSpacing={10} noOfSections={5} yAxisColor="#333" xAxisColor="#333" yAxisTextStyle={{ color: '#888', fontSize: 10 }} xAxisLabelTextStyle={{ color: '#888', fontSize: 10 }} hideDataPoints={false} dataPointsColor="#A78BFA" dataPointsRadius={4} curved areaChart />
          </View>
        )}
        {weights.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Historique</Text>
            {weights.slice(0, 10).map((w) => (
              <View key={w.id} style={styles.historyItem}>
                <Text style={styles.historyWeight}>{w.weight} kg</Text>
                <Text style={styles.historyDate}>{w.date}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Photos de progression</Text>
          <TouchableOpacity style={styles.addExerciseBtn} onPress={pickImage}>
            <Ionicons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {photos.length === 0 ? (
          <Text style={styles.emptyText}>Aucune photo de progression</Text>
        ) : (
          <View style={styles.photosGrid}>
            {photos.map((photo) => (
              <TouchableOpacity key={photo.id} style={styles.photoThumb} onPress={() => { setSelectedPhoto(photo); setPhotoViewerModal(true); }}>
                <Image source={{ uri: photo.image_base64 }} style={styles.photoImage} />
                <Text style={styles.photoDate}>{photo.date}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Modal visible={photoViewerModal} transparent animationType="fade">
          <View style={styles.photoViewerOverlay}>
            <TouchableOpacity style={styles.closePhotoBtn} onPress={() => { setPhotoViewerModal(false); setSelectedPhoto(null); }}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            {selectedPhoto && <Image source={{ uri: selectedPhoto.image_base64 }} style={styles.fullPhoto} resizeMode="contain" />}
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A78BFA" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fitness App</Text>
      </View>
      {activeTab === 'home' && renderHomeTab()}
      {activeTab === 'nutrition' && renderNutritionTab()}
      {activeTab === 'sport' && renderSportTab()}
      {activeTab === 'progress' && renderProgressTab()}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
          <Ionicons name={activeTab === 'home' ? 'home' : 'home-outline'} size={24} color={activeTab === 'home' ? '#A78BFA' : '#666'} />
          <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('nutrition')}>
          <Ionicons name={activeTab === 'nutrition' ? 'restaurant' : 'restaurant-outline'} size={24} color={activeTab === 'nutrition' ? '#A78BFA' : '#666'} />
          <Text style={[styles.navText, activeTab === 'nutrition' && styles.navTextActive]}>Nutrition</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('sport')}>
          <Ionicons name={activeTab === 'sport' ? 'fitness' : 'fitness-outline'} size={24} color={activeTab === 'sport' ? '#A78BFA' : '#666'} />
          <Text style={[styles.navText, activeTab === 'sport' && styles.navTextActive]}>Sport</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('progress')}>
          <Ionicons name={activeTab === 'progress' ? 'stats-chart' : 'stats-chart-outline'} size={24} color={activeTab === 'progress' ? '#A78BFA' : '#666'} />
          <Text style={[styles.navText, activeTab === 'progress' && styles.navTextActive]}>Progrès</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', marginTop: 10, fontSize: 16 },
  header: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  tabContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  dateText: { fontSize: 14, color: '#888', marginBottom: 20, textTransform: 'capitalize' },
  card: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginLeft: 10 },
  progressContainer: { marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: '#333', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 14, color: '#fff' },
  remainingText: { fontSize: 12, color: '#888' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryNumber: { fontSize: 32, fontWeight: 'bold', color: '#A78BFA' },
  summaryLabel: { fontSize: 14, color: '#888' },
  workoutItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  workoutName: { fontSize: 16, color: '#fff' },
  workoutDetails: { fontSize: 12, color: '#888' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  inputCard: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 20 },
  input: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14, fontSize: 16, color: '#fff', marginBottom: 12 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inputHalf: { flex: 0.48 },
  addButton: { backgroundColor: '#A78BFA', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  mealCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  mealDetails: { fontSize: 14, color: '#888', marginTop: 4 },
  deleteButton: { padding: 8 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },
  exerciseCard: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 12 },
  exerciseCompleted: { borderWidth: 1, borderColor: '#10B981' },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { fontSize: 18, fontWeight: '600', color: '#fff' },
  exerciseDetails: { fontSize: 14, color: '#888', marginTop: 4 },
  customBadge: { fontSize: 12, color: '#A78BFA', marginTop: 4 },
  completeButton: { backgroundColor: '#A78BFA', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  completedButton: { backgroundColor: '#10B981' },
  addExerciseBtn: { backgroundColor: '#A78BFA', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 0.48, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#333' },
  confirmButton: { backgroundColor: '#A78BFA' },
  cancelButtonText: { color: '#888', fontSize: 16, fontWeight: '600' },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chartCard: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 20, alignItems: 'center' },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 16, alignSelf: 'flex-start' },
  historyCard: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 20 },
  historyTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  historyWeight: { fontSize: 16, color: '#A78BFA', fontWeight: '600' },
  historyDate: { fontSize: 14, color: '#888' },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 100 },
  photoThumb: { width: '48%', aspectRatio: 0.75, marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  photoImage: { width: '100%', height: '85%' },
  photoDate: { textAlign: 'center', color: '#888', fontSize: 12, paddingVertical: 4 },
  photoViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closePhotoBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  fullPhoto: { width: '90%', height: '80%' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#1a1a1a', paddingVertical: 10, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#333' },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  navText: { fontSize: 12, color: '#666', marginTop: 4 },
  navTextActive: { color: '#A78BFA' },
});



