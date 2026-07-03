import { Dashboard } from "./DashBoard";
import { motion } from "framer-motion";

const Home= () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black  text-white"
    >
    <Dashboard />

    </motion.div>
  );
};

export default Home;