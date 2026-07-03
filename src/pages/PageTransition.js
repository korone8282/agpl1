import { motion } from "framer-motion"

const PageTransition = ({ children }) => {
  return (
    <div className="relative w-full min-h-screen">
      {/* White overlay sections that first close from left, then slide out to right */}
      <motion.div
        className="fixed top-0 left-0 w-full h-[20vh] bg-white z-30"
        initial={{ x: "-100%" }}
        animate={{ x: ["100%", "0%", "100%"] }}
        transition={{ 
          times: [0, 0.5, 1],
          duration: 1.2, 
          ease: "easeInOut",
          delay: 0.2 
        }}
      />
      <motion.div
        className="fixed top-[20vh] left-0 w-full h-[20vh] bg-white z-30"
        initial={{ x: "-100%" }}
        animate={{ x: ["100%", "0%", "100%"] }}
        transition={{ 
          times: [0, 0.5, 1],
          duration: 1.2, 
          ease: "easeInOut",
          delay: 0.3 
        }}
      />
      <motion.div
        className="fixed top-[40vh] left-0 w-full h-[20vh] bg-white z-30"
        initial={{ x: "-100%" }}
        animate={{ x: ["100%", "0%", "100%"] }}
        transition={{ 
          times: [0, 0.5, 1],
          duration: 1.2, 
          ease: "easeInOut",
          delay: 0.4 
        }}
      />
      <motion.div
        className="fixed top-[60vh] left-0 w-full h-[20vh] bg-white z-30"
        initial={{ x: "-100%" }}
        animate={{ x: ["100%", "0%", "100%"] }}
        transition={{ 
          times: [0, 0.5, 1],
          duration: 1.2, 
          ease: "easeInOut",
          delay: 0.5 
        }}
      />
      <motion.div
        className="fixed top-[80vh] left-0 w-full h-[20vh] bg-white z-30"
        initial={{ x: "-100%" }}
        animate={{ x: ["100%", "0%", "100%"] }}
        transition={{ 
          times: [0, 0.5, 1],
          duration: 1.2, 
          ease: "easeInOut",
          delay: 0.6 
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.4 }}
        className="relative z-20"
      >
        {children}
      </motion.div>
    </div>
  )
}

export default PageTransition